import client from '../config/elasticsearch-config.js';

export const searchCodeSnippets = async (query: string) => {
    const result = await client.search({
        index: 'code-snippets',
        body: {
            query: {
                match: { content: query },
            },
        },
    });

    // Truy cập vào hits trực tiếp từ result
    return result.hits.hits;
};
