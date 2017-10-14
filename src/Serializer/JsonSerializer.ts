import { MimeStringTypeSerializerAssociation } from "../types/MimeStringTypeSerializerAssociation";

export const JsonSerializer = {
    serializer: JSON.stringify,
    type: "application/json",
} as MimeStringTypeSerializerAssociation;
