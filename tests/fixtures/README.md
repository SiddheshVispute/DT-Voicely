# Synthetic speech fixture

`booking-request.wav` was generated with Windows System.Speech for automated testing. It contains no user recording or personal data. The spoken request is:

> I would like to book a consultation tomorrow at four P M. My name is Alex Morgan.

`npm run test:voice` feeds this recording through Chrome's virtual microphone, the real MediaRecorder path, and the actual Whisper model. It then confirms the proposed appointment through the UI and verifies persistence. Speech-to-text and booking are not mocked. This does not test a physical microphone or audible speaker output.
