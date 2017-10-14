import { MimeStringTypeSerializerAssociation } from "../types/MimeStringTypeSerializerAssociation";

export const HtmlSerializer = {
    serializer: (object: string) => object,
    type: "text/html",
} as MimeStringTypeSerializerAssociation;
