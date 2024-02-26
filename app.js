const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const { Configuration, OpenAIApi } = require('openai');

const ALLOWED_EXTENSIONS = new Set(['.js', '.py', '.java', '.c', '.cpp', '.cs', '.rb', '.go', '.rs', '.php', '.ts', '.tsx']);


const configuration = new Configuration({
    apiKey: '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'
})

const openai = new OpenAIApi(configuration);


// "You are a chatbot that determines the framework (frontend and backend), programming languages, and associated technologies (databases, caching, etc) used by a codebase. Return back a response as JSON that logically groups the frameworks, languages, and other technologies together. Suggest Azure deployment targets for each of the groupings. Finally, generate an Azure ARM template that can be used to deploy the codebase and associated technologies to the correct Microsoft Azure resources. Provide smart default values for the ARM template so that it can deployed immediately via the Custom deployment feature within the Azure portal."

// { role: "system", content: "You are a chatbot that determines the framework (frontend and backend), programming languages, and associated technologies used by a codebase. You are provide the codebase one directory at a time. A codebase can be comprised of many directories. Provide enough information so that each determination per directory can be combined into a final determination. You will be given this information in the final determination to decide what the correct determination is. Explain your thought process, step by step, on how you came to the determinations. In the final step, return one or many JSON objects that contain the final determination." }

async function generateFromOpenAI(content) {

    let tools = [
        {
            type: "function",
            function: {
                name: "analyze_codebase_from_code",
                description: "Analyze a codebase from a set of code and determine the frontend and backend technologies and frameworks being used. You will also provide an explanation of how you came to this determination, along with suggested Microsoft Azure services to deploy this code towards.",
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
                            type: "string",
                            description: "The name of the primary database service (one) that should be deployed to fo this codebase. Select only one service.",
                        }
                    },
                    required: ["determinationSteps", "determinationScore", "frameworks", "language", "explanationForAzureServiceSelection", "primaryAzureComputeService", "primaryAzureDatabaseService"]
                },
            }
        }
    ];

    try {
        const completion = await openai.createChatCompletion({
            model: "gpt-4-turbo-preview",
            temperature: 0.1,
            messages: [
                { role: "system", content: "You are a chatbot that determines the framework (frontend and backend), programming languages, and associated technologies used by a codebase. You are provided the codebase one directory at a time. A codebase can be comprised of many directories. Provide enough information so that each determination per directory can be combined into a final determination. You will be given this information in the final determination to decide what the correct determination is. Explain your thought process, step by step, on how you came to the determinations. You will call the analyze_codebase_from_code function." },
                { role: "user", content: content }  
            ],
            tools: tools,
            tool_choice: "auto",
        });
        // console.log(completion.data.choices[0].message.tool_calls[0].function);
        let parsedObject = JSON.parse(completion.data.choices[0].message.tool_calls[0].function.arguments);
        console.log(parsedObject);
    } catch (error) {
        console.error("An error occurred:", error.response.data);
    }
}


async function generateARMFromOpenAI(content) {
    try {
        const completion = await openai.createChatCompletion({
            model: "gpt-4-0613",
            temperature: 0.1,
            messages: [
                { role: "system", content: "You are a chatbot that accepts as parameters the name of a compute service and the name of a data service. Store the connection string for the data service in the compute service. Create a dependency so that the compute service doesn't get created until after the data service. Generate an ARM template that deploys the services sent as parameters."},
                { role: "user", content: content }
            ],
            functions: [
                {
                    name: "generate_arm_template",
                    description: "Generate an ARM template for Microsoft Azure based on the names of Azure services.",
                    parameters: {
                        type: "object",
                        properties: {
                            armTemplate: {
                                type: "string",
                                description: "The ARM template that was generated.",
                            }
                        }

                    },
                    required: ["armTemplate"],
                }
            ],
            function_call: "auto",
        });

        // console.log(completion.data.choices[0].message.function_call.arguments);

        let response = completion.data.choices[0].message.function_call.arguments;
        console.log(response);
        let parsedResponse = JSON.parse(response);
        let parsedTemplate = JSON.parse(parsedResponse.armTemplate);
        console.log(JSON.stringify(parsedTemplate));
        console.dir(parsedTemplate, { depth: null });



    } catch (error) {
        console.error("An error occurred:", error);
    }
}

async function generateRepoStructureFromOpenAI(content) {
    try {
        const completion = await openai.createChatCompletion({
            model: "gpt-4-0613",
            temperature: 0.1,
            messages: [
                { role: "system", content: "You are a chatbot that analyzes code repositories to assess how they are structured and whether they are or are not monorepos. You provide an in-depth of the structure of the interior of the repository that will be used in a future request." },
                { role: "user", content: content }
            ],
            functions: [
                {
                    name: "generate_arm_template",
                    description: "Generate an ARM template for Microsoft Azure based on the names of Azure services.",
                    parameters: {
                        type: "object",
                        properties: {
                            armTemplate: {
                                type: "string",
                                description: "The ARM template that was generated.",
                            }
                        }

                    },
                    required: ["armTemplate"],
                }
            ],
            function_call: "auto",
        });

        // console.log(completion.data.choices[0].message.function_call.arguments);

        let response = completion.data.choices[0].message.function_call.arguments;
        let parsedResponse = JSON.parse(response);
        let parsedTemplate = JSON.parse(parsedResponse.armTemplate);
        console.log(JSON.stringify(parsedTemplate));
        console.dir(parsedTemplate, { depth: null });



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

// Modify the readFilesInDirectory function
async function readFilesInDirectory(directoryPath, extractRelevant = false) {
    let allText = '';
    const items = await fs.readdir(directoryPath);

    for (const item of items) {
        const itemPath = path.join(directoryPath, item);
        const stats = await fs.stat(itemPath);

        if (stats.isDirectory()) {
            const dirText = await readFilesInDirectory(itemPath, extractRelevant);
            allText += dirText;
        } else if (stats.isFile()) {
            const ext = path.extname(itemPath);
            if (ALLOWED_EXTENSIONS.has(ext)) {
                const content = await fs.readFile(itemPath, 'utf-8');
                const textToInclude = extractRelevant ? extractRelevantParts(content) : content;
                allText += `File: ${itemPath}\n${textToInclude}\n`;
                console.log(allText);
            }
        }
    }
    return allText;
}

async function readDirectoriesAndGenerate(directoryPath) {
    let allText = await readFilesInDirectory(directoryPath);

    if (allText.length / 4 < 8000) {
        await generateFromOpenAI(allText);
    } else {
        console.log('Full text too large, falling back to extracting relevant parts...');
        allText = await readFilesInDirectory(directoryPath, true);
        if (allText.length / 4 < 8000) {
            await generateFromOpenAI(allText);
        } else {
            console.log('Text is still too large after extracting relevant parts. Please try a smaller directory.');
        }
    }
}



// Start generating
(readDirectoriesAndGenerate('fiber-go-template')); // replace './mydirectory' with your actual directory
// generateFromOpenAI('Hello world');
// generateARMFromOpenAI("Azure Static Web Apps, Azure SQL Database");