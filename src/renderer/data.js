// Static data: physical layout (from the official driver's KeyboardLayout.xml), HID usages, media keys.
// [label, keyIndex(=lightIndex), x, y, w, defaultUsage]
window.SK_LAYOUT = [
  ['Esc', 1, 72, 29, 28, 0x29], ['F1', 2, 127, 29, 28, 0x3a], ['F2', 3, 168, 29, 28, 0x3b], ['F3', 4, 209, 29, 28, 0x3c], ['F4', 5, 250, 29, 28, 0x3d],
  ['F5', 6, 304, 29, 28, 0x3e], ['F6', 7, 345, 29, 28, 0x3f], ['F7', 8, 386, 29, 28, 0x40], ['F8', 9, 427, 29, 28, 0x41],
  ['F9', 10, 482, 29, 28, 0x42], ['F10', 11, 523, 29, 28, 0x43], ['F11', 12, 564, 29, 28, 0x44], ['F12', 13, 605, 29, 28, 0x45],
  ['~', 19, 72, 79, 28, 0x35], ['1', 20, 113, 79, 28, 0x1e], ['2', 21, 154, 79, 28, 0x1f], ['3', 22, 194, 79, 28, 0x20], ['4', 23, 235, 79, 28, 0x21],
  ['5', 24, 275, 79, 28, 0x22], ['6', 25, 315, 79, 28, 0x23], ['7', 26, 356, 79, 28, 0x24], ['8', 27, 397, 79, 28, 0x25], ['9', 28, 437, 79, 28, 0x26],
  ['0', 29, 478, 79, 28, 0x27], ['-', 30, 518, 79, 28, 0x2d], ['=', 31, 559, 79, 28, 0x2e], ['Backspace', 103, 600, 79, 68, 0x2a], ['Ins', 116, 700, 79, 28, 0x49],
  ['Tab', 37, 72, 120, 50, 0x2b], ['Q', 38, 133, 120, 28, 0x14], ['W', 39, 174, 120, 28, 0x1a], ['E', 40, 214, 120, 28, 0x08], ['R', 41, 255, 120, 28, 0x15],
  ['T', 42, 295, 120, 28, 0x17], ['Y', 43, 336, 120, 28, 0x1c], ['U', 44, 376, 120, 28, 0x18], ['I', 45, 417, 120, 28, 0x0c], ['O', 46, 458, 120, 28, 0x12],
  ['P', 47, 498, 120, 28, 0x13], ['[', 48, 538, 120, 28, 0x2f], [']', 49, 579, 120, 28, 0x30], ['\\', 67, 619, 120, 50, 0x31], ['Del', 119, 700, 120, 28, 0x4c],
  ['Caps', 55, 72, 159, 55, 0x39], ['A', 56, 143, 159, 28, 0x04], ['S', 57, 183, 159, 28, 0x16], ['D', 58, 224, 159, 28, 0x07], ['F', 59, 264, 159, 28, 0x09],
  ['G', 60, 304, 159, 28, 0x0a], ['H', 61, 345, 159, 28, 0x0b], ['J', 62, 385, 159, 28, 0x0d], ['K', 63, 425, 159, 28, 0x0e], ['L', 64, 466, 159, 28, 0x0f],
  [';', 65, 507, 159, 28, 0x33], ["'", 66, 548, 159, 28, 0x34], ['Enter', 85, 588, 159, 80, 0x28], ['PgUp', 118, 700, 159, 28, 0x4b],
  ['Shift', 73, 72, 200, 77, 0xe1], ['Z', 74, 164, 200, 28, 0x1d], ['X', 75, 205, 200, 28, 0x1b], ['C', 76, 245, 200, 28, 0x06], ['V', 77, 285, 200, 28, 0x19],
  ['B', 78, 326, 200, 28, 0x05], ['N', 79, 367, 200, 28, 0x11], ['M', 80, 407, 200, 28, 0x10], [',', 81, 447, 200, 28, 0x36], ['.', 82, 488, 200, 28, 0x37],
  ['/', 83, 528, 200, 28, 0x38], ['Shift', 84, 569, 200, 58, 0xe5], ['↑', 101, 648, 210, 28, 0x52], ['PgDn', 121, 700, 200, 28, 0x4e],
  ['Ctrl', 91, 72, 241, 37, 0xe0], ['Win', 92, 124, 241, 37, 0xe3], ['Alt', 93, 174, 241, 37, 0xe2], ['', 94, 225, 241, 236, 0x2c],
  ['Alt', 95, 476, 241, 28, 0xe6], ['Fn', 96, 517, 241, 28, 0], ['Ctrl', 98, 559, 241, 28, 0xe4],
  ['←', 99, 607, 252, 28, 0x50], ['↓', 100, 648, 252, 28, 0x51], ['→', 102, 689, 252, 28, 0x4f],
].map(([label, idx, x, y, w, usage]) => ({ label, idx, x, y, w, h: 28, usage }));

// KeyboardEvent.code -> [HID usage, short label]
window.SK_CODES = {
  KeyA: [0x04, 'A'], KeyB: [0x05, 'B'], KeyC: [0x06, 'C'], KeyD: [0x07, 'D'], KeyE: [0x08, 'E'], KeyF: [0x09, 'F'], KeyG: [0x0a, 'G'],
  KeyH: [0x0b, 'H'], KeyI: [0x0c, 'I'], KeyJ: [0x0d, 'J'], KeyK: [0x0e, 'K'], KeyL: [0x0f, 'L'], KeyM: [0x10, 'M'], KeyN: [0x11, 'N'],
  KeyO: [0x12, 'O'], KeyP: [0x13, 'P'], KeyQ: [0x14, 'Q'], KeyR: [0x15, 'R'], KeyS: [0x16, 'S'], KeyT: [0x17, 'T'], KeyU: [0x18, 'U'],
  KeyV: [0x19, 'V'], KeyW: [0x1a, 'W'], KeyX: [0x1b, 'X'], KeyY: [0x1c, 'Y'], KeyZ: [0x1d, 'Z'],
  Digit1: [0x1e, '1'], Digit2: [0x1f, '2'], Digit3: [0x20, '3'], Digit4: [0x21, '4'], Digit5: [0x22, '5'], Digit6: [0x23, '6'],
  Digit7: [0x24, '7'], Digit8: [0x25, '8'], Digit9: [0x26, '9'], Digit0: [0x27, '0'],
  Enter: [0x28, 'Enter'], Escape: [0x29, 'Esc'], Backspace: [0x2a, 'Backspace'], Tab: [0x2b, 'Tab'], Space: [0x2c, 'Espaço'],
  Minus: [0x2d, '-'], Equal: [0x2e, '='], BracketLeft: [0x2f, '['], BracketRight: [0x30, ']'], Backslash: [0x31, '\\'],
  Semicolon: [0x33, ';'], Quote: [0x34, "'"], Backquote: [0x35, '~'], Comma: [0x36, ','], Period: [0x37, '.'], Slash: [0x38, '/'],
  CapsLock: [0x39, 'Caps'], F1: [0x3a, 'F1'], F2: [0x3b, 'F2'], F3: [0x3c, 'F3'], F4: [0x3d, 'F4'], F5: [0x3e, 'F5'], F6: [0x3f, 'F6'],
  F7: [0x40, 'F7'], F8: [0x41, 'F8'], F9: [0x42, 'F9'], F10: [0x43, 'F10'], F11: [0x44, 'F11'], F12: [0x45, 'F12'],
  PrintScreen: [0x46, 'PrtSc'], ScrollLock: [0x47, 'ScrLk'], Pause: [0x48, 'Pause'], Insert: [0x49, 'Ins'], Home: [0x4a, 'Home'],
  PageUp: [0x4b, 'PgUp'], Delete: [0x4c, 'Del'], End: [0x4d, 'End'], PageDown: [0x4e, 'PgDn'],
  ArrowRight: [0x4f, '→'], ArrowLeft: [0x50, '←'], ArrowDown: [0x51, '↓'], ArrowUp: [0x52, '↑'],
  NumLock: [0x53, 'NumLk'], NumpadDivide: [0x54, 'Num /'], NumpadMultiply: [0x55, 'Num *'], NumpadSubtract: [0x56, 'Num -'],
  NumpadAdd: [0x57, 'Num +'], NumpadEnter: [0x58, 'Num Enter'], Numpad1: [0x59, 'Num 1'], Numpad2: [0x5a, 'Num 2'],
  Numpad3: [0x5b, 'Num 3'], Numpad4: [0x5c, 'Num 4'], Numpad5: [0x5d, 'Num 5'], Numpad6: [0x5e, 'Num 6'], Numpad7: [0x5f, 'Num 7'],
  Numpad8: [0x60, 'Num 8'], Numpad9: [0x61, 'Num 9'], Numpad0: [0x62, 'Num 0'], NumpadDecimal: [0x63, 'Num .'],
  ContextMenu: [0x65, 'Menu'], IntlBackslash: [0x64, '\\ (ISO)'], IntlRo: [0x87, '/ (ABNT)'],
  F13: [0x68, 'F13'], F14: [0x69, 'F14'], F15: [0x6a, 'F15'], F16: [0x6b, 'F16'], F17: [0x6c, 'F17'], F18: [0x6d, 'F18'],
  F19: [0x6e, 'F19'], F20: [0x6f, 'F20'], F21: [0x70, 'F21'], F22: [0x71, 'F22'], F23: [0x72, 'F23'], F24: [0x73, 'F24'],
  ControlLeft: [0xe0, 'Ctrl'], ShiftLeft: [0xe1, 'Shift'], AltLeft: [0xe2, 'Alt'], MetaLeft: [0xe3, 'Win'],
  ControlRight: [0xe4, 'Ctrl Dir.'], ShiftRight: [0xe5, 'Shift Dir.'], AltRight: [0xe6, 'AltGr'], MetaRight: [0xe7, 'Win Dir.'],
};
window.SK_USAGE_LABEL = {};
for (const [, [u, l]] of Object.entries(window.SK_CODES)) window.SK_USAGE_LABEL[u] = l;

// Groups shown in the "Tecla" picker
window.SK_KEY_GROUPS = [
  ['Letras', 'KeyA KeyB KeyC KeyD KeyE KeyF KeyG KeyH KeyI KeyJ KeyK KeyL KeyM KeyN KeyO KeyP KeyQ KeyR KeyS KeyT KeyU KeyV KeyW KeyX KeyY KeyZ'],
  ['Números e símbolos', 'Digit1 Digit2 Digit3 Digit4 Digit5 Digit6 Digit7 Digit8 Digit9 Digit0 Minus Equal BracketLeft BracketRight Backslash Semicolon Quote Backquote Comma Period Slash IntlBackslash IntlRo'],
  ['Funções', 'F1 F2 F3 F4 F5 F6 F7 F8 F9 F10 F11 F12 F13 F14 F15 F16 F17 F18 F19 F20 F21 F22 F23 F24'],
  ['Controle', 'Escape Tab CapsLock Enter Backspace Space PrintScreen ScrollLock Pause Insert Delete Home End PageUp PageDown ContextMenu'],
  ['Setas', 'ArrowUp ArrowDown ArrowLeft ArrowRight'],
  ['Modificadores', 'ControlLeft ShiftLeft AltLeft MetaLeft ControlRight ShiftRight AltRight MetaRight'],
  ['Teclado numérico', 'NumLock NumpadDivide NumpadMultiply NumpadSubtract NumpadAdd NumpadEnter Numpad1 Numpad2 Numpad3 Numpad4 Numpad5 Numpad6 Numpad7 Numpad8 Numpad9 Numpad0 NumpadDecimal'],
];

// Consumer-page usages (multimedia)
window.SK_MEDIA = [
  [0xcd, 'Play / Pausa'], [0xb7, 'Parar'], [0xb6, 'Faixa anterior'], [0xb5, 'Próxima faixa'],
  [0xe9, 'Volume +'], [0xea, 'Volume −'], [0xe2, 'Mudo'],
  [0x192, 'Calculadora'], [0x18a, 'E-mail'], [0x194, 'Meu computador'], [0x183, 'Player de mídia'],
  [0x223, 'Navegador: início'], [0x221, 'Navegador: buscar'], [0x224, 'Navegador: voltar'], [0x225, 'Navegador: avançar'],
  [0x227, 'Navegador: atualizar'], [0x226, 'Navegador: parar'], [0x22a, 'Navegador: favoritos'],
  [0x6f, 'Brilho da tela +'], [0x70, 'Brilho da tela −'],
];

// 24x24 icons for media actions (stroke paths; "F:" prefix = filled path)
window.SK_ICONS = {
  0xcd: 'F:M7 5v14l7-7zM15 5h2.5v14H15zM19.5 5H22v14h-2.5z',
  0xb7: 'F:M6 6h12v12H6z',
  0xb6: 'F:M6 5h2.5v14H6zM20 5v14L9 12z',
  0xb5: 'F:M15.5 5H18v14h-2.5zM4 5v14l11-7z',
  0xe9: 'M4 9v6h4l5 4V5L8 9zM16 9.5a3.5 3.5 0 010 5M18.5 7a7 7 0 010 10M20 12h3M21.5 10.5v3',
  0xea: 'M4 9v6h4l5 4V5L8 9zM16 9.5a3.5 3.5 0 010 5M19 12h4',
  0xe2: 'M4 9v6h4l5 4V5L8 9zM17 9l5 6M22 9l-5 6',
  0x192: 'M6 3h12v18H6zM8.5 6h7v3h-7zM9 12h.01M12 12h.01M15 12h.01M9 15h.01M12 15h.01M15 15h.01M9 18h.01M12 18h.01M15 18h.01',
  0x18a: 'M3 6h18v12H3zM3 7l9 6 9-6',
  0x194: 'M3 4h18v12H3zM8 20h8M12 16v4',
  0x183: 'M4 4h16v16H4zM10 8.5v7l6-3.5z',
  0x223: 'M4 11l8-7 8 7M6 9.5V20h4v-5h4v5h4V9.5',
  0x221: 'M10.5 4a6.5 6.5 0 110 13 6.5 6.5 0 010-13zM15.5 15.5L21 21',
  0x224: 'M19 12H5M11 6l-6 6 6 6',
  0x225: 'M5 12h14M13 6l6 6-6 6',
  0x227: 'M20 11a8 8 0 10-2.3 5.7M20 4v7h-7',
  0x226: 'M6 6l12 12M18 6L6 18',
  0x22a: 'M12 3l2.8 5.8 6.2.9-4.5 4.4 1 6.2L12 17.4 6.5 20.3l1-6.2L3 9.7l6.2-.9z',
  0x6f: 'M12 8a4 4 0 110 8 4 4 0 010-8zM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9L7 7M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1',
  0x70: 'M12 8a4 4 0 110 8 4 4 0 010-8zM12 4v1M12 19v1M4 12h1M19 12h1',
  mouse1: 'M7 9a5 5 0 0110 0v6a5 5 0 01-10 0zM12 4v6M7 10h10',
};
window.SK_ICON = (key, size = 18) => {
  const d = window.SK_ICONS[key]; if (!d) return '';
  const filled = d.startsWith('F:');
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" class="ico" ${filled ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"'}><path d="${filled ? d.slice(2) : d}"/></svg>`;
};

// Mouse buttons (experimental: the official driver doesn't expose this)
window.SK_MOUSE = [[1, 'Clique esquerdo'], [2, 'Clique direito'], [4, 'Clique do meio'], [8, 'Botão 4 (voltar)'], [16, 'Botão 5 (avançar)']];

// Direction choices the keyboard really has, per effect: [label, value].
// Rolagem tested on the keyboard: even values = top→bottom, odd = bottom→top; no horizontal option exists.
window.SK_DIRS = {
  10: [['↓ Baixo', 0], ['↑ Cima', 1]],
  11: [['↗ Sentido 1', 0], ['Sentido 2', 1]],
  16: [['Sentido 1', 0], ['Sentido 2', 1]],
  18: [['↗ Sentido 1', 0], ['Sentido 2', 1]],
};

// one-line explanation per effect, and whether it reacts to typing (shown in the Iluminação view)
window.SK_MODE_INFO = {
  0: ['Todas as luzes apagadas.'],
  1: ['Uma cor parada em todas as teclas.'],
  2: ['As teclas acendem quando você aperta e apagam devagar.', true],
  3: ['Tudo aceso; a tecla apertada apaga e depois volta.', true],
  4: ['Teclas piscam em lugares aleatórios, como estrelas.'],
  5: ['Gotas de luz caem pelas colunas.'],
  6: ['Cada tecla vai mudando de cor sozinha.'],
  7: ['O teclado acende e apaga devagar.'],
  8: ['O teclado inteiro passa por todas as cores.'],
  9: ['Ondas de cor saem do centro para fora.'],
  10: ['Faixas de cor descem ou sobem pelo teclado.'],
  11: ['Faixas de cor andam na diagonal.'],
  12: ['As cores giram em volta do centro.'],
  13: ['A fileira da tecla apertada acende a partir dela.', true],
  14: ['Duas ondas saem da tecla apertada, uma para cada lado.', true],
  15: ['Um anel de luz se espalha a partir da tecla apertada.', true],
  16: ['Uma fileira inteira acende de cada vez.'],
  17: ['Uma onda sai do H para os dois lados, subindo e descendo.'],
  18: ['Faixas de luz na diagonal, uma atrás da outra, entre o Ctrl e a telinha.'],
  19: ['Cada fileira tem uma faixa de luz que vai e volta.'],
  // app effects: the app sends them to the keyboard while it is open
  100: ['Chamas sobem das teclas de baixo.'],
  101: ['Faixas verdes e roxas ondulam devagar, como a aurora boreal.'],
  102: ['Gotas verdes caem pelas colunas, como no filme.'],
  103: ['Céu escuro com estrelas brancas piscando devagar.'],
  104: ['O teclado pulsa duas vezes, como um coração. Usa a cor escolhida.'],
  105: ['Metade vermelha e metade azul piscando, uma de cada vez.'],
  106: ['Ondas azuis passando, com espuma clara.'],
  107: ['Manchas vermelhas e laranja se mexendo devagar.'],
  108: ['Todas as cores fluindo em manchas.'],
  109: ['Uma luz com rastro passa por todas as fileiras. Usa a cor escolhida.'],
  110: ['Céu escuro com relâmpagos de vez em quando.'],
  111: ['Pontinhos amarelo-esverdeados passeando e brilhando.'],
  112: ['Teclas acendem em cores aleatórias e apagam.'],
};

// [mode id, name, has direction] — direction confirmed in captures for modes 10, 11, 16, 18
window.SK_MODES = [
  [1, 'Estático', false], [2, 'Acende ao tocar', false], [3, 'Apaga ao tocar', false], [4, 'Cintilante', false],
  [5, 'Chuva', false], [6, 'Colorido', false], [7, 'Respiração', false], [8, 'Espectro', false],
  [9, 'Para fora', false], [10, 'Rolagem', true], [11, 'Rolando', true], [12, 'Girando', false],
  [13, 'Explosão', false], [14, 'Lançamento', false], [15, 'Ondulações', false], [16, 'Fluxo', true],
  [17, 'Pulsante', false], [18, 'Inclinado', true], [19, 'Vai e vem', false], [0, 'Desligado', false],
  // app effects (sim.js appEffect): only while the app is open
  [100, 'Fogo', false], [101, 'Aurora', false], [102, 'Matrix', false], [103, 'Estrelas', false],
  [104, 'Batimento', false], [105, 'Sirene', false], [106, 'Oceano', false], [107, 'Lava', false],
  [108, 'Plasma', false], [109, 'Cometa', false], [110, 'Tempestade', false], [111, 'Vagalumes', false],
  [112, 'Confete', false],
];
