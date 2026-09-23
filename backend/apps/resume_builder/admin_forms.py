from django import forms

from apps.portfolio.models import Certification, Education, Experience, Project, Skill
from apps.resume_builder.models import JobApplicationRecord, ResumeVersion


class ResumeDraftForm(forms.Form):
    resume_type = forms.ChoiceField(choices=ResumeVersion.ResumeType.choices)
    title = forms.CharField(max_length=200, initial="Software Engineer | Backend Engineer | Python & Django Developer")
    target_role = forms.CharField(max_length=150, required=False)
    target_organization = forms.CharField(max_length=255, required=False)
    custom_summary = forms.CharField(
        required=False,
        initial=(
            "Software Engineer specializing in Python/Django backend engineering, "
            "REST APIs, PostgreSQL, and backend-heavy full-stack product delivery "
            "with React/Next.js."
        ),
        widget=forms.Textarea,
    )
    experiences = forms.ModelMultipleChoiceField(queryset=Experience.objects.none(), required=False)
    education = forms.ModelMultipleChoiceField(queryset=Education.objects.none(), required=False)
    skills = forms.ModelMultipleChoiceField(queryset=Skill.objects.none(), required=False)
    projects = forms.ModelMultipleChoiceField(queryset=Project.objects.none(), required=False)
    certifications = forms.ModelMultipleChoiceField(queryset=Certification.objects.none(), required=False)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["experiences"].queryset = Experience.objects.filter(status="published").order_by("-start_date", "pk")
        self.fields["education"].queryset = Education.objects.filter(status="published").order_by("-start_date", "pk")
        self.fields["skills"].queryset = Skill.objects.filter(published=True).select_related("category").order_by("category__display_order", "display_order", "pk")
        self.fields["projects"].queryset = Project.objects.filter(status="published").order_by("display_order", "pk")
        self.fields["certifications"].queryset = Certification.objects.filter(status="published", is_verified=True).order_by("-issue_date", "pk")

        # A new Master résumé should start from the current verified public
        # portfolio instead of an empty selection screen. The owner can still
        # remove anything before creating the draft. Keep projects bounded to
        # the three highest-priority published records so the default remains
        # a concise recruiter CV rather than silently expanding to every case
        # study as the portfolio grows.
        if not self.is_bound:
            self.initial.setdefault("resume_type", ResumeVersion.ResumeType.MASTER)
            self.initial.setdefault(
                "experiences",
                list(self.fields["experiences"].queryset.values_list("pk", flat=True)),
            )
            self.initial.setdefault(
                "education",
                list(self.fields["education"].queryset.values_list("pk", flat=True)),
            )
            self.initial.setdefault(
                "skills",
                list(self.fields["skills"].queryset.values_list("pk", flat=True)),
            )
            self.initial.setdefault(
                "projects",
                list(self.fields["projects"].queryset.values_list("pk", flat=True)[:3]),
            )
            self.initial.setdefault(
                "certifications",
                list(self.fields["certifications"].queryset.values_list("pk", flat=True)),
            )

    def clean(self):
        cleaned = super().clean()
        if cleaned.get("resume_type") == ResumeVersion.ResumeType.MASTER:
            cleaned["target_organization"] = ""
            cleaned["title"] = "Software Engineer | Backend Engineer | Python & Django Developer"
        return cleaned


class ResumeContentForm(forms.Form):
    EDITABLE_SECTIONS = {"summary", "contact", "experience", "education", "skills", "projects", "certifications"}
    SECTION_LABELS = {
        "summary": "Professional summary",
        "contact": "Contact",
        "experience": "Experience",
        "education": "Education",
        "skills": "Skills",
        "projects": "Project",
        "certifications": "Certification",
    }

    def __init__(self, *args, content=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.allowed_names = set()
        section_counts = {}
        for index, item in enumerate((content or {}).get("items", [])):
            section = item.get("section")
            if section not in self.EDITABLE_SECTIONS:
                continue

            name = f"item_{index}"
            self.allowed_names.add(name)
            section_counts[section] = section_counts.get(section, 0) + 1
            base_label = self.SECTION_LABELS[section]
            label = base_label if section == "summary" else f"{base_label} {section_counts[section]}"

            if section == "summary":
                widget = forms.Textarea(attrs={"rows": 4, "cols": 100})
            elif section in {"experience", "projects"} and len(item.get("text", "")) > 90:
                widget = forms.Textarea(attrs={"rows": 2, "cols": 100})
            else:
                widget = forms.TextInput(attrs={"size": 100})

            self.fields[name] = forms.CharField(
                label=label,
                initial=item.get("text", ""),
                required=False,
                widget=widget,
            )
        self.content = content or {}

    def clean(self):
        cleaned = super().clean()
        unknown = set(self.data) - set(self.fields) - {"csrfmiddlewaretoken", "_save"}
        if unknown:
            raise forms.ValidationError("Unknown résumé content fields were submitted.")
        return cleaned

    def build_content(self):
        content = {"positioning": self.content.get("positioning", ""), "items": []}
        for index, item in enumerate(self.content.get("items", [])):
            copied = dict(item)
            copied["text"] = self.cleaned_data.get(f"item_{index}", item.get("text", ""))
            content["items"].append(copied)
        return content


class JobApplicationAdminForm(forms.ModelForm):
    class Meta:
        model = JobApplicationRecord
        fields = ("organization", "job_title", "job_url", "job_description_snapshot", "job_description_hash", "resume_version", "notes", "follow_up_date", "owner")
        widgets = {"job_description_snapshot": forms.Textarea}
