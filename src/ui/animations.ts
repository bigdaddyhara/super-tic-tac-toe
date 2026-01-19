// lightweight animation hooks; stubs for now
export function pulse(element: HTMLElement) {
  element.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.05)' }, { transform: 'scale(1)' }], { duration: 240 })
}
