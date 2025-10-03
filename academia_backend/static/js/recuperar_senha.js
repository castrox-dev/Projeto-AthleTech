document.addEventListener('DOMContentLoaded', function(){
  const form = document.getElementById('recuperarSenhaForm');
  if (!form) return;
  form.addEventListener('submit', function(e){
    e.preventDefault();
    const btn = form.querySelector('.btn-primary');
    if (btn){ btn.disabled = true; btn.textContent = 'Enviando...'; }
    setTimeout(()=>{
      if (btn){ btn.disabled = false; btn.textContent = 'Recuperar senha'; }
      const msg = document.getElementById('message');
      if (msg){ msg.textContent = 'Se o e-mail existir, enviaremos um link de recuperação.'; }
    }, 800);
  });
});


