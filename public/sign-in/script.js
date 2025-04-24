const form = document.getElementById('signin-form')
const msgBox = document.getElementById('signin-message')

form.addEventListener('submit', async (e) => {
  e.preventDefault()

  const formData = new FormData(form)
  const response = await fetch('/api/sign-in', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: formData.get('username'),
      password: formData.get('password'),
    }),
  })

  if (!response.ok) {
    const data = await response.json()
    msgBox.innerText = data?.error || ''
    return
  }
  window.location.replace('/')
})
