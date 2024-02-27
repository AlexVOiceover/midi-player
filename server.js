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
		const messageContent = req.body.message
		if (!messageContent) {
			return res.status(400).json({ error: 'Message content is required.' })
		}

		console.log('User asked: ', messageContent)

		// Create a thread only if it doesn't already exist
		if (!existingThreadId) {
			const thread = await openai.beta.threads.create({})
			existingThreadId = thread.id // Store the new thread ID for future requests
			console.log('Thread has been created:', existingThreadId)
		} else {
			console.log('Using existing thread:', existingThreadId)
		}

		// Add a message to the thread
		await openai.beta.threads.messages.create(existingThreadId, {
			role: 'user',
			content: messageContent,
		})

		// Create a run with the assistant and the thread
		const run = await openai.beta.threads.runs.create(existingThreadId, {
			assistant_id: process.env.ASSISTANT_ID,
		})

		// Function to check the status of the run
		const checkRunStatus = async (threadId, runId) => {
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
		await checkRunStatus(existingThreadId, run.id)

		// Retrieve the list of messages from the thread
		const messages = await openai.beta.threads.messages.list(existingThreadId)
		const lastAssistantMessage = messages.data
			//.reverse()
			.find((m) => m.role === 'assistant')?.content[0].text.value

		console.log('Assistant answer:', lastAssistantMessage) // Respond with the last message from the assistant

		res.json({ answer: lastAssistantMessage })
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
