interface FalconArgs {
    query?: unknown;
    sources?: unknown;
    language?: unknown;
    max_results?: unknown;
    from_date?: unknown;
    to_date?: unknown;
}
export declare function handleFalcon(args: FalconArgs): Promise<{
    isError: boolean;
    content: {
        type: string;
        text: string;
    }[];
}>;
export declare const falconDefinition: {
    name: string;
    description: string;
    inputSchema: {
        type: "object";
        properties: {
            query: {
                type: string;
                description: string;
            };
            sources: {
                type: string;
                items: {
                    type: string;
                    enum: string[];
                };
                description: string;
            };
            language: {
                type: string;
                description: string;
            };
            max_results: {
                type: string;
                description: string;
            };
            from_date: {
                type: string;
                description: string;
            };
            to_date: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
};
export {};
//# sourceMappingURL=falcon.d.ts.map