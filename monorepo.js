const fs = require('fs');
const path = require('path');
const { Configuration, OpenAIApi } = require('openai');

const configuration = new Configuration({
    apiKey: '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'
})

const openai = new OpenAIApi(configuration);

function generateRepoStructure(dir, level = 0) {
    let structure = "";
    const padding = " ".repeat(level * 2);

    if (fs.statSync(dir).isDirectory()) {
        const children = fs.readdirSync(dir);
        structure += padding + path.basename(dir) + "/\n";

        for (let i = 0; i < children.length; i++) {
            structure += generateRepoStructure(path.join(dir, children[i]), level + 1);
        }
    } else {
        structure += padding + path.basename(dir) + "\n";
    }

    return structure;
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
                    name: "generate_repository_structure",
                    description: "Generate an assessment of the structure of the repo -- think step by step as you do it -- and determine whether it is a monorepo or not.",
                    parameters: {
                        type: "object",
                        properties: {
                            repositoryAssessment: {
                                type: "string",
                                description: "The assessment of the repository"
                            },
                            isItMonoRepo: {
                                type: "string",
                                description: "A true/false value on whether the repository is a monorepo"
                            }
                        }

                    },
                    required: ["repositoryStructure", "isItMonoRepo"]
                }
            ],
            function_call: "auto",
        });

        // console.log(completion.data.choices[0].message.function_call.arguments);

        let response = completion.data.choices[0].message
        console.log(response)

    } catch (error) {
        console.error("An error occurred:", error.response);
    }
}

console.log(generateRepoStructureFromOpenAI(generateRepoStructure('./azure-search-openai-demo-csharp')));  // replace './my-repo' with your repo path