/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type AssetDto = {
    _id: string;
    name: string;
    description?: string;
    tags: Array<string>;
    archived: boolean;
    version: number;
    storageStatus: 'AWAITING_UPLOAD' | 'PENDING_STORAGE';
    originalFilename?: string;
    mediaType?: string;
    sizeBytes?: number;
    /**
     * SHA-256 digest of the received file
     */
    checksumSha256?: string;
    receivedAt?: string;
    createdAt: string;
    updatedAt: string;
};

