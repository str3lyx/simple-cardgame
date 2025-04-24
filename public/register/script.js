const form = document.getElementById('register-form')
const msgBox = document.getElementById('register-message')

form.addEventListener('submit', async (e) => {
  e.preventDefault()

  const formData = new FormData(form)
  const response = await fetch('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: formData.get('username'),
      name: formData.get('name'),
      password: formData.get('password'),
      password2: formData.get('password2'),
    }),
  })

  if (!response.ok) {
    const data = await response.json()
    msgBox.innerText = data?.error || ''
    return
  }
  window.location.replace('/sign-in')
})
