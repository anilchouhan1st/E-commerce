function inverseMousePosition(element, event) {
  const rect = element.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  const res = {
    x1: -(x - rect.width / 2) / 20,
    y1: -(y - rect.height / 2) / 20,
    x2: -(x - rect.width / 2) / 20, 
    y2: (y - rect.height / 2) / 20,
    x3: (x - rect.width / 2) / 20, 
    y3: -(y - rect.height / 2) / 20,
    x4: (x - rect.width / 2) / 20, 
    y4: (y - rect.height / 2) / 20
  };

  const resKey =
    "x" + (x < rect.width / 2 ? 1 : 2) + (y < rect.height / 2 ? 1 : 3);
  const tilt = res;
  return tilt !== undefined ? tilt : 0;
}

function handleClick(event) {
  const nav = document.querySelector('.nav');
  const target = event.target.parentNode;
  const width = target.offsetWidth;
  const { left } = target.getBoundingClientRect();
  const offsetLeft = left - nav.getBoundingClientRect().left;

  [...nav.querySelectorAll('li')].map(link => link.classList.remove('active'))
  event.target.parentNode.classList.add('active');

  nav.style.setProperty('--after-bg-position', offsetLeft);
  nav.style.setProperty('--after-radial-bg-position', (left + width / 2) - nav.getBoundingClientRect().left);
  nav.style.setProperty('--after-bg-width', width);
}

const nav = document.querySelector('.nav');

const links = nav.querySelectorAll('li a');

for (let i = 0; i < links.length; i++) {
  links[i].addEventListener('click', handleClick);
  links[i].addEventListener("mousemove", (event) => {
    const tilt = inverseMousePosition(event.target, event);

    nav.style.setProperty("--tilt-bg-y", tilt.x1 * 2); 
    nav.style.setProperty("--tilt-bg-x", tilt.y1 * 2); 
  });
}

window.addEventListener('DOMContentLoaded', () => {

  const activeLink = nav.querySelector('li.active a');

  if (!activeLink) return;

  const { width, left } =
    activeLink.parentNode.getBoundingClientRect();

  const offsetLeft =
    left - nav.getBoundingClientRect().left;

  nav.style.setProperty('--after-bg-position', offsetLeft);
  nav.style.setProperty('--after-radial-bg-position', offsetLeft + width / 2);
  nav.style.setProperty('--after-bg-width', width);
});