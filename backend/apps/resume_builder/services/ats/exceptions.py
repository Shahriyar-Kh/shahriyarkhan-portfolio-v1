class ATSAssessmentError(Exception):
    code = "ats_assessment_error"


class ATSInputError(ATSAssessmentError):
    code = "ats_invalid_input"
