export interface JWTPayload {
    adminId : string,
    email : string,
    role : string
}

export interface ApiResponse <T= any> {
    success : boolean,
    message ?: string,
    data ?: T,
    error ?: string
    errors ?: Record<string , string>
}

export interface IClass {
    id ?: string ,
    name : string ,
    startTime : string,
    endTime : string ,
    ageMin : number,
    ageMax : number,
    teacherId ?: string,
    maxStudents : number,
    currentStudents : number,
    createdAt ?: Date,
    updatedAt ?: Date
}
export interface IParent{
    id?: string ,
    fatherFirstName : string,
    fatherLastName : string,
    fatherPhone : string,
    fatherEmail : string,
    motherFirstName ?: string,
    motherLastName ?: string,
    motherPhone ?: string,
    motherEmail ?: string,
    createdAt ?: Date,
    updatedAt ?: Date
}

export interface ISudent {
    id?: string,
    parentId: string,
    firstName : string,
    lastName : string,
    dateOfBirth : Date,
    age : number,
    classId ?: string,
    registrationStatus : 'pending' | 'approved' | 'rejected',
    createdAt ?: Date,
    updatedAt ?: Date
}
export interface ITeacher {
    id ?: string,
    name : string ,
    email : string ,
    phone : string,
    specialization ?: string,
    createdAt ?: Date,
    updatedAt ?: Date
}

export interface RegistrationRequest {
    parent : Omit<IParent , 'id' | 'createdAt' | 'updatedAt'>
    student : Omit<ISudent , 'id' | 'createdAt' | 'updatedAt'>
}

export interface QueryOptions {
    page ?: number,
    limit ?: number,
    sort ?: string,
    search?: string,
    status ?: string,
    classId  ?: string
} 


export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination: {
      page: number
      limit: number
      total: number
      pages: number
    }
}
export interface RegistrationWithDetails {
    id: string
    parentId: string
    firstName: string
    lastName: string
    dateOfBirth: string | Date // Allow both types
    age: number
    classId?: string | null
    registrationStatus: string
    createdAt: Date
    updatedAt: Date
    parent: {
      id: string
      fatherFirstName: string
      fatherLastName: string
      fatherPhone: string
      fatherEmail: string
      motherFirstName?: string | null
      motherLastName?: string | null
      motherPhone?: string | null
      motherEmail?: string | null
    }
    class?: {
      id: string
      name: string
      startTime: string
      endTime: string
      ageMin: number
      ageMax: number
      maxStudents: number
      currentStudents: number
    } | null
    teacher?: {
      id: string
      name: string
      email: string
      phone: string
      specialization?: string | null
    } | null
  }