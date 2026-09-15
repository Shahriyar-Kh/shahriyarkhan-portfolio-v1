from django import forms

from apps.portfolio.models import Certification, Education, Experience, Project, Skill
from apps.resume_builder.models import JobApplicationRecord, ResumeVersion


class ResumeDraftForm(forms.Form):
    resume_type = forms.ChoiceField(choices=ResumeVersion.ResumeType.choices)
    title = forms.CharField(max_length=200, initial="Software Engineer | Python & Django Full-Stack Developer")
    target_role = forms.CharField(max_length=150, required=False)
    target_organization = forms.CharField(max_length=255, required=False)
    custom_summary = forms.CharField(required=False, widget=forms.Textarea)
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

    def clean(self):
        cleaned = super().clean()
        if cleaned.get("resume_type") == ResumeVersion.ResumeType.MASTER:
            cleaned["target_organization"] = ""
            cleaned["title"] = "Software Engineer | Python & Django Full-Stack Developer"
        return cleaned


class ResumeContentForm(forms.Form):
    def __init__(self, *args, content=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.allowed_names = set()
        for index, item in enumerate((content or {}).get("items", [])):
            if item.get("section") in {"summary", "experience", "education", "skills", "projects", "certifications"}:
                name = f"item_{index}"
                self.allowed_names.add(name)
                self.fields[name] = forms.CharField(label=item.get("section", "Content").title(), initial=item.get("text", ""), required=False)
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
