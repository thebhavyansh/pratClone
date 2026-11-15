# Interview Copilot

A small Windows desktop copilot for technical mock interviews and interviews where AI assistance is permitted.

## Use it

1. Install [Interview Copilot for Windows](release/Interview%20Copilot%20Setup%200.1.0.exe), or run from source with `npm ci` and `npm start`.
2. On first launch, enter your Gemini and Deepgram API keys if asked. When running from source, existing `GEMINI_API_KEY` and `DEEPGRAM_API_KEY` values in `.env` are loaded automatically. The `REACT_APP_` names also work. Keys entered in the app are encrypted using Electron's OS key storage.
3. Press **Listen** to transcribe Windows system audio. A spoken question triggers a detailed Gemini answer. Press **Stop listening** to release audio capture.
4. Type a question and press **Ask** for a direct answer. You can also press Ctrl+Enter in the question box.
5. Press **Capture & solve** to take a screenshot of the display containing the app and solve the problem shown there. The app shows no screenshot preview, confirmation step, or screenshot notification. The screen image is sent to Gemini once and is not stored in SQLite. Windows or other screen capture software may show its own capture indicator.

The app decides how to answer from the question. Coding answers include an approach, code, correctness explanation, complexity, and edge cases when relevant. The full answer appears on the same screen. There are no mode, input, or tab controls.

The app starts with listening off. It stores transcripts, questions, answers, and project notes locally in SQLite. Raw audio and screenshots are not stored. Windows system audio is sent to Deepgram for transcription, and the question and optional screenshot are sent to Gemini for the answer.

## Build and verify

```powershell
npm ci
npm test
npm start
npm run dist:win
```

The installer is written to `release/Interview Copilot Setup 0.1.0.exe`. It is unsigned, so Windows may show a SmartScreen prompt. `npm start` rebuilds the SQLite native module for Electron; `npm test` rebuilds it for Node. Run `node scripts/ui-smoke.js` after `npm run prestart` for a rendered UI check.

Windows system audio uses Electron's [display media loopback](https://www.electronjs.org/docs/latest/api/session#sessetdisplaymediarequesthandlerhandler-opts). Deepgram receives a live WebM/Opus stream. Gemini receives text and, for Capture, one PNG image. The app does not create a screenshot notification. The operating system may present a required capture indicator or permission prompt.
# pratClone
