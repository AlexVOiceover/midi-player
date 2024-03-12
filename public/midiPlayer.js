// Check for Web MIDI support and request MIDI access
if (navigator.requestMIDIAccess) {
	console.log('Web MIDI API supported')
} else {
	console.log('Web MIDI API not supported in this browser.')
}

let midiOutput = null

const chatOutput = document.getElementById('assistantResponse')

// Function to initialize MIDI outputs dropdown and listeners
function initializeMIDI() {
	navigator.requestMIDIAccess({ sysex: false }).then(
		(midiAccess) => {
			const outputsArray = Array.from(midiAccess.outputs.values())
			const midiOutputSelect = document.getElementById('midiOutputs')
			midiOutputSelect.innerHTML = outputsArray
				.map((output) => `<option value="${output.id}">${output.name}</option>`)
				.join('')

			midiOutputSelect.addEventListener('change', function () {
				midiOutput = midiAccess.outputs.get(this.value)
			})

			if (outputsArray.length > 0) {
				// Set the default MIDI output to the last available output
				midiOutputSelect.value = outputsArray[outputsArray.length - 1].id
				midiOutput = midiAccess.outputs.get(
					outputsArray[outputsArray.length - 1].id
				)
			} else {
				// If no MIDI outputs available, set a default value for midiOutput
				midiOutput = null // Set to null or any other default value as needed
			}
		},
		() => {
			console.log(
				'Failed to get MIDI access. Please check your browser settings.'
			)
		}
	)
}

// Call the initialization function
initializeMIDI()
// Array to hold timeout references
let timeouts = []
// Variable to track playback state
let isPlaying = false

let activeNotes = {} // Object to keep track of active notes

function playMidi() {
	console.log('playMidi function called')
	const midiInput = document.getElementById('midiInput')
	const midiLines = midiInput.value.trim().split('\n')
	const startTime = Date.now()

	// Toggle playback state and clear existing timeouts if already playing
	if (isPlaying) {
		// Stop all scheduled MIDI notes
		timeouts.forEach(clearTimeout)
		timeouts = [] // Reset the timeouts array
		isPlaying = false // Update playback state
		console.log('Playback stopped')
		return // Exit the function to stop further execution
	}

	// Set isPlaying to true as playback starts
	isPlaying = true

	midiLines.forEach((line, index) => {
		const [timestamp, messageType, note, velocity] = line
			.split(', ')
			.map((item) => item.trim())
		const scheduleTime = startTime + parseInt(timestamp, 10) // Schedule time based on the current time
		const noteNumber = parseInt(note, 10)
		const velocityNumber = parseInt(velocity, 10)

		// Store each timeout reference
		// Schedule the MIDI message
		const timeout = setTimeout(() => {
			// Check if the note is already active
			if (activeNotes[noteNumber] && messageType === 'NoteOn') {
				// If the note is active and we have another NoteOn, send NoteOff first
				const noteOffMessage = [0x80, noteNumber, 0]
				midiOutput && midiOutput.send(noteOffMessage)
				// Small delay before playing the note again
				setTimeout(() => {
					midiOutput && midiOutput.send([0x90, noteNumber, velocityNumber])
				}, 10) // Delay of 10ms
			} else {
				// Otherwise, just send the MIDI message as usual
				const midiMessage =
					messageType === 'NoteOn'
						? [0x90, noteNumber, velocityNumber]
						: [0x80, noteNumber, 0] // MIDI message
				midiOutput && midiOutput.send(midiMessage)

				// Highlight the current line being played
				highlightLine(index)
			}

			// Update the activeNotes registry
			if (messageType === 'NoteOn') {
				activeNotes[noteNumber] = true
			} else if (messageType === 'NoteOff') {
				delete activeNotes[noteNumber]
			}

			// ... (rest of your timeout function)
		}, scheduleTime - Date.now())

		// Add the timeout reference to the array
		timeouts.push(timeout)
	})
}

function highlightLine(lineIndex) {
	const textarea = document.getElementById('midiInput')
	const lines = textarea.value.split('\n')

	// Calculate the start and end positions of the line to highlight
	let start = 0
	for (let i = 0; i < lineIndex; i++) {
		start += lines[i].length + 1 // +1 for the newline character
	}
	const end = start + lines[lineIndex].length

	// Highlight the line
	textarea.focus()
	textarea.setSelectionRange(start, end)

	const proportionOfStart = start / textarea.value.length
	// Apply this proportion to the scroll height to approximate the scroll position
	textarea.scrollTop =
		textarea.scrollHeight * proportionOfStart - textarea.clientHeight / 2
}

function askAssistant() {
	const modelVersion = document.getElementById('modelSelect').value
	const questionInput = document.getElementById('questionInput')
	const question = questionInput.value

	const askButton = document.getElementById('askButton')

	let improvedQuestion =
		question +
		'. The new song has to be different than the previous one. Just generate a full MIDI sequence and no other explanation or instructions'

	//const improvedQuestion = question

	let calculatingText = `Analysing under ${modelVersion}: ${question}\n`
	chatOutput.innerHTML = calculatingText

	askButton.classList.remove('btn-primary')
	askButton.classList.add('btn-secondary')
	askButton.disabled = true

	// Record start time
	const startTime = Date.now()

	// Set an interval to append dots to the calculating text
	const dotsInterval = setInterval(() => {
		calculatingText += '*'
		chatOutput.innerHTML = calculatingText
	}, 2000)

	if (improvedQuestion) {
		fetch('http://localhost:3000/ask', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				message: improvedQuestion,
				modelVersion: modelVersion,
			}),
		})
			.then((response) => response.json())
			.then((data) => {
				clearInterval(dotsInterval)
				console.log('Asking ', modelVersion, ' : ', improvedQuestion)
				console.log('DATA ANSWER ', data.answer)

				// Check if the answer contains a MIDI sequence
				const midiRegex = /#MIDI([\s\S]*?)##MIDI/
				const match = data.answer.match(midiRegex)
				if (match) {
					const midiSequence = match[1].trim()
					let updatedAnswer = data.answer.replace(match[0], '') // Remove MIDI sequence from the answer
					// Remove newlines
					updatedAnswer = updatedAnswer.replace(/\n/g, ' ')
					// Remove `` characters
					updatedAnswer = updatedAnswer.replace(/``/g, '')
					if (updatedAnswer) {
						chatOutput.innerHTML = updatedAnswer // Update the assistant response without MIDI sequence
					} else {
						const duration = (Date.now() - startTime) / 1000 // Calculate duration in seconds
						chatOutput.innerHTML = `Done: ${question}\nDuration: ${duration} seconds`
					}
					document.getElementById('midiInput').value = midiSequence // Add MIDI sequence to midiInput textarea
				} else {
					chatOutput.innerHTML = data.answer // If no MIDI sequence found, display the original answer
				}

				chatOutput.scrollTop = chatOutput.scrollHeight
				askButton.classList.remove('btn-secondary')
				askButton.classList.add('btn-primary')
				askButton.disabled = false // Disable the button
			})
			.catch((error) => {
				clearInterval(dotsInterval)
				console.error('Error:', error)
				chatOutput.innerHTML += `<p><strong>Error:</strong> Could not get an answer.</p>`
				askButton.classList.remove('btn-secondary') // Remove secondary class
				askButton.classList.add('btn-primary')
				askButton.disabled = false // Disable the button
			})
			.finally(() => {
				askButton.classList.remove('btn-secondary')
				askButton.classList.add('btn-primary')
				askButton.disabled = false
			})
	} else {
		clearInterval(dotsInterval) // Clear the interval if there's no question
	}
}

function resetAssistant() {
	chatOutput.innerHTML = 'Reset thread'
	fetch('http://localhost:3000/reset', {
		method: 'POST', // Specify the method
		headers: {
			'Content-Type': 'application/json', // Set the content type header
		},
	})
		.then((response) => {
			if (!response.ok) {
				// Check if the response status code is not OK (200-299)
				throw new Error('Network response was not ok')
			}
			return response.json() // Parse the JSON of the response
		})
		.then((data) => {
			console.log(data.message) // Log the success message
			//alert('Assistant has been reset successfully.') // Optionally, alert the user
		})
		.catch((error) => {
			console.error('Error resetting assistant:', error)
			alert('Error resetting assistant. Please try again.') // Optionally, alert the user
		})
}

// Add this at the bottom of your midiPlayer.js file
document.addEventListener('DOMContentLoaded', function () {
	// Existing initialization code...
	initializeMIDI()

	const questionInput = document.getElementById('questionInput')
	questionInput.addEventListener('keypress', function (event) {
		if (event.key === 'Enter') {
			event.preventDefault() // Prevent default Enter key behavior
			askAssistant() // Call the askAssistant function
		}
	})
})
