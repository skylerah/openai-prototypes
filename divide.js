const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const { Configuration, OpenAIApi } = require('openai');

const ALLOWED_EXTENSIONS = new Set(['.js', '.py', '.java', '.c', '.cpp', '.cs', '.rb', '.go', '.rs', '.php', '.ts', '.tsx']);

const MAX_TOKENS = 8000;

const configuration = new Configuration({
    apiKey: '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'
})

const openai = new OpenAIApi(configuration);


// "You are a chatbot that determines the framework (frontend and backend), programming languages, and associated technologies (databases, caching, etc) used by a codebase. Return back a response as JSON that logically groups the frameworks, languages, and other technologies together. Suggest Azure deployment targets for each of the groupings. Finally, generate an Azure ARM template that can be used to deploy the codebase and associated technologies to the correct Microsoft Azure resources. Provide smart default values for the ARM template so that it can deployed immediately via the Custom deployment feature within the Azure portal."

// { role: "system", content: "You are a chatbot that determines the framework (frontend and backend), programming languages, and associated technologies used by a codebase. You are provide the codebase one directory at a time. A codebase can be comprised of many directories. Provide enough information so that each determination per directory can be combined into a final determination. You will be given this information in the final determination to decide what the correct determination is. Explain your thought process, step by step, on how you came to the determinations. In the final step, return one or many JSON objects that contain the final determination." }

async function generateFromOpenAI(content) {
    try {
        const completion = await openai.createChatCompletion({
            model: "gpt-4-0613",
            temperature: 0.1,
            messages: [
                { role: "user", content: content }
            ],
            functions: [
                {
                    name: "analyze_codebase_from_code",
                    description: "Analyze a codebase from a set of code and determine the technologies and frameworks being used. You will also provide an explanation of how you came to this determination, along with suggested Microsoft Azure services to deploy this code towards. You also generate an ARM template that deploys that resource.",
                    parameters: {
                        type: "object",
                        properties: {
                            determinationSteps: {
                                type: "string",
                                description: "A set of steps that explains how the determination was made.",
                            },
                            determinationScore: {
                                type: "number",
                                description: "A value from 0 to 100 that represents the confidence of the determination.",
                            },
                            frameworks: {
                                type: "string",
                                description: "The names of the web frameworks being used in the codebase.",
                            },
                            language: {
                                type: "string",
                                description: "The names of the programming languages being used in the codebase",
                            },
                            explanationForAzureServiceSelection: {
                                type: "string",
                                description: "A set of steps that explains how you made the selection for the Azure services",
                            },
                            primaryAzureComputeService: {
                                type: "string",
                                description: "The name of the primary service (one) that should be deployed to fo this codebase. Select only one service.",
                            },
                            primaryAzureDatabaseService: {
                                description: "The name of the primary database service (one) that should be deployed to fo this codebase. Select only one service.",
                            }
                        },
                        required: ["dialogue"],
                    },
                }
            ],
            function_call: "auto",
        });
        
        console.log(completion.data.choices[0].message);
    } catch (error) {
        console.error("An error occurred:", error.response.data);
    }
}


// Helper function to extract relevant parts of code
function extractRelevantParts(code) {
    const lines = code.split('\n');

    // Filter out comments and empty lines
    const noCommentLines = lines.filter(line => {
        const trimmedLine = line.trim();
        return !(trimmedLine.startsWith('//') || trimmedLine.startsWith('/*') || trimmedLine.startsWith('*') || trimmedLine.endsWith('*/') || trimmedLine.length === 0);
    });

    // Filter for relevant parts of the code
    const relevantLines = noCommentLines.filter(line => {
        const trimmedLine = line.trim();
        // We're checking if the line contains one of these keywords at the beginning or after a whitespace
        const keywords = ['import ', ' require(', ' include ', 'class ', 'function(', 'def '];
        return keywords.some(keyword => {
            const index = trimmedLine.indexOf(keyword);
            return index === 0 || (index > 0 && trimmedLine.charAt(index - 1) === ' ');
        }) && !trimmedLine.startsWith('export const');
    });

    return relevantLines.join('\n');
}


async function readDirectoriesAndGenerate(directoryPath) {
    // Read all files and create an array of promises, each resolving to a piece of code no larger than MAX_TOKENS
    const allTexts = await readFilesInDirectory(directoryPath, MAX_TOKENS);

    // Analyze each text separately and combine the results
    const results = await Promise.all(allTexts.map(generateFromOpenAI));
    console.log(results);
    
    // At this point, `results` is an array of results from the AI.
    // You may want to consolidate these results into a single object
    // and/or filter out irrelevant results here.

    return results; // Or return consolidated results
}

// Modify the readFilesInDirectory function to split the code into chunks of maximum size
async function readFilesInDirectory(directoryPath, maxSize) {
    const chunks = [];
    let chunk = '';
    const items = await fs.readdir(directoryPath);

    for (const item of items) {
        const itemPath = path.join(directoryPath, item);
        const stats = await fs.stat(itemPath);

        if (stats.isDirectory()) {
            const dirChunks = await readFilesInDirectory(itemPath, maxSize);
            chunks.push(...dirChunks);
        } else if (stats.isFile()) {
            const ext = path.extname(itemPath);
            if (ALLOWED_EXTENSIONS.has(ext)) {
                const content = await fs.readFile(itemPath, 'utf-8');
                const textToInclude = `File: ${itemPath}\n${extractRelevantParts(content)}\n`;

                // If adding this text to the current chunk would make it too large, start a new chunk
                if ((chunk.length + textToInclude.length) / 4 > maxSize) {
                    chunks.push(chunk);
                    chunk = '';
                }

                chunk += textToInclude;
            }
        }
    }

    // Don't forget the last chunk!
    if (chunk !== '') {
        chunks.push(chunk);
    }

    return chunks;
}

readDirectoriesAndGenerate('./thefunkiestapi-ui-live');