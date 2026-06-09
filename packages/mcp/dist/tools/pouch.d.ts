interface PouchArgs {
    id?: unknown;
}
export declare function handlePouch(args: PouchArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: string;
    }[];
}>;
export declare const pouchDefinition: {
    name: string;
    description: string;
    inputSchema: {
        type: "object";
        properties: {
            id: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
};
export {};
//# sourceMappingURL=pouch.d.ts.map