# `/renderer/themes`

The renderer process `themes` module contains application themes. Theme are the
entry point for what the browserWindow's load.

Different themes are designed to accomplish different tasks.

1. Andromeda theme - The UI. Designed to be loaded in the `mainPlayer`
   browserWindow.
2. WaveformCreator - Uses the Web Audio API, which is only available in a
   renderer process, to create audio waveforms. Designed to be loaded in an
   `invisibleWindow` browserWindow.