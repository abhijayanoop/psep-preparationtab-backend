export interface IStudent {
  _id: string;
  course: string;
  courseDuration?: number;
  currentSemester?: number;
  studentName?: string;
  talismaStdId?: string;
  tal_enrollmentNumber?: string;
  degree?: string;
  programme?: string;
  specialization?: string;
  branch?: string;
  major?: string;
  minor?: string;
  university?: string;
  universityId?: string;
  curriculumType?: string;
  enrollmentYear?: number;
  email?: string;
  mobileNumber?: string;
  noOfYearsOfStudy?: number;
  createdDate?: Date;
  address?: string;
  college?: string;
  collegeId?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  semester?: number;
  dob?: Date;
  religion?: string;
  caste?: string;
  minority?: boolean;
  nationality?: string;
  gender?: string;
  hsc?: {
    stream?: string;
    marks?: {
      subject?: string;
      subjectMarks?: number;
    }[];
  };
  cas?: number;
  cgpa?: number;
  employabilityIndex?: number;
  acquiredSkills?: [string];

  unverifiedSkills?: [string];
  empIndexGraph?: [{ sem: string; empIndex: number }];
  skillIndex?: number;
  knowledgeIndex?: number;
  totalQuestions?: number;
  correctAnswers?: number;
  academicIndex?: number;
  marketIndex?: number;
  careerData: {
    industry: string;
    role: string;
  };
}

export default IStudent;
