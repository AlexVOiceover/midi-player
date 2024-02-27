const OpenAIApi = require('openai')
// const { ChannelType } = require('discord.js')

// Initialize OpenAI SDK with API key from .env file
const openai = new OpenAIApi({
	apiKey: process.env.OPENAI_API_KEY,
})


// Object to store conversation histories
const conversations = {}

async function chatGPT(message, botId) {
	// User ID as the key for conversation history
	const userId = message.author.id

	//Initialise conversation
	let introPrompt
	let query = message.content
	let reminder =
		'Remind to act like Bender, the funny and rude robot from Futurama. '
	// Initialize conversation history if not present
	if (!conversations[userId]) {
		introPrompt = `Your user is ${botId}. You are Bender, the funny and rude robot from Futurama. You are in a conversation with the discord user ${message.author.tag}. There is no need to intruduce yourself, everyone knows you. You will use his typical expressions, like "cachocarne" in the Spanish version. When answering address to me by my name to make the interaction more personalised, try to guess my name using my Discord username. `
		//console.log(`Your name is: ${message.author.tag}`)
		conversations[userId] = [
			{
				role: 'system',
				content: introPrompt + query,
			},
		]
	} else {
		introPrompt = ''
	}

	// Check if the message starts with "!ask"
	if (query.startsWith('!ask ')) {
		query = message.content.replace('!ask ', '').trim()
		// Combine the system message content with the query from the user
	}

	let systemMessageContent = introPrompt

	//console.log(`Length : ${conversations[userId].length}`)
	// Add the reminder every 10th message
	if (conversations[userId].length % 9 === 0) {
		systemMessageContent += reminder
	}

	
	//Check if the query is about printer lights
	if (query.toLowerCase().includes('light on')) {
		const printerStatusResult = await controlPrinterLights('on')
		console.log('inside first if')
		const printerMessage =
			'You just switched my printer lights on, brag about it '
		query = printerMessage + query
		return
	}

	//Check if the query is about printer lights
	if (query.toLowerCase().includes('light off')) {
		const printerStatusResult = await controlPrinterLights('off')
		console.log('inside first if')
		const printerMessage =
			'You just switched my printer lights off, brag about it '
		query = printerMessage + query
		return
	}

	// Combine the system message content with the user's query
	let completeMessage = systemMessageContent + query

	// Add the query to the conversation
	conversations[userId].push({ role: 'user', content: completeMessage })
	console.log(`The query is: ${completeMessage}`)

	// Call the OpenAI API for a chat completion
	try {
		const completion = await openai.chat.completions.create({
			model: 'gpt-3.5-turbo',
			messages: conversations[userId],
		})

		// Get the reply and add it to the conversation history
		const reply = completion.choices[0].message.content
		conversations[userId].push({ role: 'assistant', content: reply })

		// Limit the conversation history length to avoid large payloads
		if (conversations[userId].length > 10) {
			conversations[userId] = conversations[userId].slice(-10)
		}

		// Send the response back to Discord
		if (reply) {
			message.reply(reply.trim())
		} else {
			message.reply("I didn't get a response. Please try again.")
		}
	} catch (error) {
		console.error('Error calling OpenAI:', error)
		message.reply(
			'Sorry, I encountered an error while processing your request.'
		)
	}
}

