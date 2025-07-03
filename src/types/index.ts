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