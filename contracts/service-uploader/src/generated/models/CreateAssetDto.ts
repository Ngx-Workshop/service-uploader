/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CreateAssetDto = {
    /**
     * Virtual folder ID; omit or use null for root
     */
    folderId?: string | null;
    name: string;
    description?: string;
    tags?: Array<string>;
    archived?: boolean;
};

