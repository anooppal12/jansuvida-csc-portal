const modal = document.getElementById('authModal');
const modalTitle = document.getElementById('modalTitle');
const modalText = document.getElementById('modalText');
const nameField = document.getElementById('nameField');
const modalSwitch = document.getElementById('modalSwitch');

function openModal(type) {
  if (!modal) return;
  const register = type === 'register';
  modalTitle.textContent = register ? 'Create Account' : 'Customer Login';
  modalText.textContent = register ? 'अपना नाम और मोबाइल नंबर दर्ज करें।' : 'अपने Customer Portal में प्रवेश करें।';
  nameField.hidden = !register;
  modalSwitch.innerHTML = register
    ? 'पहले से account है? <button data-modal="login">Login करें</button>'
    : 'नया ग्राहक? <button data-modal="register">Register करें</button>';
  modal.classList.add('show');
  modal.setAttribute('aria-hidden', 'false');
}

document.addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-modal]');
  if (trigger) openModal(trigger.dataset.modal);
  if (event.target === modal || event.target.id === 'modalClose') {
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && modal?.classList.contains('show')) {
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
  }
});

document.getElementById('authForm')?.addEventListener('submit', (event) => {
  event.preventDefault();
  alert('Authentication module अगले चरण में backend से connect किया जाएगा।');
});

const search = document.getElementById('serviceSearch');
const cards = [...document.querySelectorAll('.service-card')];
const noResults = document.getElementById('noResults');
search?.addEventListener('input', () => {
  const query = search.value.trim().toLowerCase();
  let visible = 0;
  cards.forEach((card) => {
    const match = !query || card.dataset.name.includes(query) || card.textContent.toLowerCase().includes(query);
    card.style.display = match ? '' : 'none';
    if (match) visible++;
  });
  noResults.hidden = visible !== 0;
});

document.getElementById('trackForm')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const number = document.getElementById('applicationNo').value.trim();
  const result = document.getElementById('trackResult');
  result.hidden = false;
  result.innerHTML = `<strong>${number}</strong> — Demo tracking screen तैयार है। Backend application tracking module अगले चरण में connect होगा।`;
});

const menuBtn = document.getElementById('menuBtn');
menuBtn?.addEventListener('click', () => {
  const nav = document.querySelector('.nav');
  nav.style.display = nav.style.display === 'flex' ? '' : 'flex';
  nav.style.position = 'absolute';
  nav.style.top = '74px';
  nav.style.left = '0';
  nav.style.right = '0';
  nav.style.padding = '18px 4%';
  nav.style.background = '#fff';
  nav.style.borderBottom = '1px solid #e7ecf4';
  nav.style.flexDirection = 'column';
});
