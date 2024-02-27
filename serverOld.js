const express = require('express')
const { Configuration, OpenAI } = require('openai')
require('dotenv').config()

const app = express()
app.use(express.json())
app.use(require('cors')()) // Use CORS middleware for cross-origin requests

// Initialize OpenAI SDK with API key from .env file
const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
})

let existingThreadId = null // Variable to store the existing thread ID

app.post('/ask', async (req, res) => {
	try {
		let messageContent = req.body.message
		if (!messageContent) {
			return res.status(400).json({ error: 'Message content is required.' })
		}

		console.log('User asked: ', messageContent)

		let threadId = existingThreadId // Use existing thread ID if available

		// Create a thread only if it doesn't already exist
		if (!threadId) {
			const thread = await openai.beta.threads.create({})
			threadId = thread.id
			existingThreadId = threadId // Store the new thread ID for future requests
			console.log('Thread has been created:', threadId)
		} else {
			console.log('Using existing thread:', threadId)
		}

		// // Add a message to the thread
		// let message = await openai.beta.threads.messages.create(threadId, {
		//     role: 'user',
		//     content: messageContent,
		// });

		// console.log('Mesagge is :', message)

		// Create a run with the assistant and the thread
		let run = await openai.beta.threads.runs.create(threadId, {
			assistant_id: process.env.ASSISTANT_ID,
		})

		// Function to check the status of the run
		let checkRunStatus = async (threadId, runId) => {
			while (true) {
				const runStatus = await openai.beta.threads.runs.retrieve(
					threadId,
					runId
				)
				if (runStatus.status === 'completed') {
					return runStatus
				} else if (runStatus.status === 'failed') {
					throw new Error('Run failed to complete')
				}
				// Wait for 3 seconds before checking again
				await new Promise((resolve) => setTimeout(resolve, 3000))
			}
		}

		// Check the status of the run and wait for it to complete
		const completedRun = await checkRunStatus(threadId, run.id)

		// Retrieve the list of messages from the thread
		const messages = await openai.beta.threads.messages.list(threadId)

		// Find the last message created by the assistant
		let lastAssistantMessageContent = null
		for (let i = messages.data.length - 1; i >= 0; i--) {
			const message = messages.data[i]
			if (message.role === 'assistant') {
				lastAssistantMessageContent = message.content[0].text.value
				break
			}
		}

		console.log('Assistant answer:', lastAssistantMessageContent) // Respond with the last message from the assistant

		res.json({ answer: lastAssistantMessageContent })
	} catch (error) {
		console.error('Error:', error)
		res
			.status(500)
			.json({ error: 'An error occurred while querying the assistant.' })
	}
})

// Endpoint to reset the existing thread ID
app.post('/reset', (req, res) => {
	existingThreadId = null // Reset the thread ID
	console.log('Thread ID has been reset')
	res.json({ message: 'Thread ID has been reset successfully.' })
})

const PORT = process.env.PORT || 3000
const server = app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`)
})

process.on('SIGINT', () => {
	console.log('Shutting down server...')
	server.close(() => {
		console.log('Server shut down gracefully.')
		process.exit(0)
	})
})
