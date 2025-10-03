// 👁️ Toggle senha
const passwordIcons = document.querySelectorAll('.password-icon');

passwordIcons.forEach(icon => {
    icon.addEventListener('click', function () {
        const input = this.parentElement.querySelector('.form-control');
        input.type = input.type === 'password' ? 'text' : 'password';
        this.classList.toggle('fa-eye');
    });
});

// 📌 Scroll Spy (menu ativo conforme a seção visível)
const sections = document.querySelectorAll("section");
const navItems = document.querySelectorAll("#nav_list .nav-item");

window.addEventListener("scroll", () => {
    let current = "";

    sections.forEach(section => {
        const sectionTop = section.offsetTop - 120; // compensação da navbar
        const sectionHeight = section.clientHeight;

        if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
            current = section.getAttribute("id");
        }
    });

    navItems.forEach(item => {
        item.classList.remove("active");
        const link = item.querySelector("a");
        if (link && link.getAttribute("href") === "#" + current) {
            item.classList.add("active");
        }
    });
});

document.getElementById('form').addEventListener('submit', async function (e) {
  e.preventDefault();

  const first_name = document.getElementById('first_name')?.value.trim();
  const last_name = document.getElementById('last_name')?.value.trim();
  const birth_date = document.getElementById('birth_date')?.value;
  const email = document.getElementById('email')?.value.trim();
  const password = document.getElementById('password')?.value;
  const password_confirm = document.getElementById('password_confirm')?.value;
  const gender = document.querySelector('input[name="gender"]:checked')?.value;

  if (!first_name || !last_name || !birth_date || !email || !password || !password_confirm || !gender) {
    alert('Por favor, preencha todos os campos.');
    return;
  }

  if (password !== password_confirm) {
    alert('As senhas não coincidem.');
    return;
  }

  const payload = {
    first_name,
    last_name,
    birth_date,
    email,
    password,
    password_confirm,
    gender
  };

  try {
    const response = await fetch('/api/register/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (response.ok) {
      alert(result.message || 'Cadastro realizado com sucesso!');
      window.location.href = '/login/';
    } else {
      const errorMsg = Object.entries(result)
        .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
        .join('\n');
      alert('Erro no cadastro:\n' + errorMsg);
    }
  } catch (error) {
    console.error('Erro de conexão:', error);
    alert('Erro ao conectar com o servidor. Tente novamente mais tarde.');
  }
});

  