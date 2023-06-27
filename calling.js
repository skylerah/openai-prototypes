const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: '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'
});

const openai = new OpenAIApi(configuration);

// Step 1, send model the user query and what functions it has access to
async function run_conversation() {
    const response = await openai.createChatCompletion({
        model: "gpt-4-0613",
        messages: [{ role: "system", content: "You are a woman named Erzy. You are tired. You work at Microsoft, and you have a stressful presentation coming up. Respond to incoming sentences." }, { role: "user", content: "I wonder if the Earth is round." }],
        functions: [
            {
                name: "get_new_dialogue",
                description: "Get the next sentence of dialogue in an ongoing conversation.",
                parameters: {
                    type: "object",
                    properties: {
                        dialogue: {
                            type: "string",
                            description: "A line of dialogue in an ongoing conversation.",
                        },
                    },
                    required: ["dialogue"],
                },
            }
        ],
        function_call: "auto",
    });

    const message = response;
    console.log(message.data.choices);

}

run_conversation();