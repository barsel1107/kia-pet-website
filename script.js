document.addEventListener('DOMContentLoaded', function () {
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  var header = document.querySelector('.site-header');
  var toggle = document.querySelector('.nav-toggle');

  if (toggle && header) {
    toggle.addEventListener('click', function () {
      var isOpen = header.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    header.querySelectorAll('.main-nav a').forEach(function (link) {
      link.addEventListener('click', function () {
        header.classList.remove('nav-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Logoya tıklandığında sayfanın başına yumuşak kaydırma yap.
  // Zaten ana sayfadaysak sayfayı yeniden yüklemek yerine sadece yukarı kaydırıyoruz.
  ['brand-home', 'brand-home-footer'].forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', function (e) {
      // el.pathname tarayıcı tarafından otomatik çözülmüş (resolved) yoldur,
      // bu sayede hem file:// hem kök dizin hem de GitHub Pages'in
      // alt klasörlü yapısında (örn. /kia-pet-website/) doğru çalışır.
      if (el.pathname === window.location.pathname) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  });

  // ---------- Randevu formu ----------
  // NOT: Site canlıya (kendi domaininize / hosting'e) alındığında bu adresi
  // randevu sunucunuzun gerçek adresiyle değiştirin (örn. "https://api.kiapetkuafor.com").
  var API_BASE = 'http://localhost:3001';

  var showFormBtn = document.getElementById('show-email-form');
  var emailForm = document.getElementById('email-booking-form');

  if (showFormBtn && emailForm) {
    showFormBtn.addEventListener('click', function () {
      var isHidden = emailForm.hasAttribute('hidden');
      if (isHidden) {
        emailForm.removeAttribute('hidden');
        showFormBtn.setAttribute('aria-expanded', 'true');
        emailForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        emailForm.setAttribute('hidden', '');
        showFormBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  if (emailForm) {
    emailForm.addEventListener('submit', function (e) {
      e.preventDefault();

      var statusEl = document.getElementById('booking-status');
      var submitBtn = document.getElementById('booking-submit');

      var payload = {
        email: document.getElementById('b-email').value.trim(),
        phone: document.getElementById('b-phone').value.trim(),
        species: document.getElementById('b-species').value,
        breed: document.getElementById('b-breed').value.trim(),
        service: document.getElementById('b-service').value,
        date: document.getElementById('b-date').value,
        time: document.getElementById('b-time').value,
        message: document.getElementById('b-message').value.trim()
      };

      if (!payload.email) {
        statusEl.textContent = 'Lütfen e-posta adresinizi girin.';
        return;
      }
      if (!payload.date || !payload.time) {
        statusEl.textContent = 'Lütfen tarih ve saat seçin.';
        return;
      }

      submitBtn.disabled = true;
      statusEl.textContent = 'Gönderiliyor...';

      fetch(API_BASE + '/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          if (!res.ok) throw new Error('Sunucu hatası');
          return res.json();
        })
        .then(function () {
          statusEl.textContent = 'Randevu talebiniz alındı! Onay durumunu e-posta adresinize göndereceğiz.';
          emailForm.reset();
        })
        .catch(function () {
          statusEl.textContent = 'Bir şeyler ters gitti, lütfen tekrar deneyin ya da bizi telefonla arayın.';
        })
        .finally(function () {
          submitBtn.disabled = false;
        });
    });
  }
});


