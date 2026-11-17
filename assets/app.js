/* dark.jeanchri.com — interactions
   Vanilla JS, aucune dépendance. Tout est neutralisé si prefers-reduced-motion. */

(() => {
	'use strict';

	const mouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	const sansSouris = window.matchMedia('(hover: none), (pointer: coarse)').matches;
	const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
	const lerp = (a, b, t) => a + (b - a) * t;

	document.getElementById('annee').textContent = new Date().getFullYear();

	/* ---------- 1. intro ---------- */

	const intro = document.getElementById('intro');
	const compteur = document.getElementById('intro-count');

	if (mouvementReduit || !intro) {
		if (intro) intro.remove();
		document.body.classList.add('pret');
	} else {
		document.body.classList.add('verrou');
		document.body.classList.remove('pret');

		let valeur = 0;
		const debut = performance.now();
		const duree = 1300;

		const tic = (maintenant) => {
			const p = clamp((maintenant - debut) / duree, 0, 1);
			valeur = Math.round(p * 100);
			compteur.textContent = String(valeur).padStart(2, '0');
			if (p < 1) {
				requestAnimationFrame(tic);
			} else {
				setTimeout(() => {
					intro.classList.add('sortie');
					document.body.classList.remove('verrou');
					document.body.classList.add('pret');
					setTimeout(() => intro.remove(), 1100);
				}, 180);
			}
		};
		requestAnimationFrame(tic);
	}

	/* ---------- 2. barre de progression ---------- */

	const barre = document.getElementById('progress-bar');

	/* ---------- 3. canvas : champ de particules ---------- */

	const toile = document.getElementById('field');

	if (toile && !mouvementReduit) {
		const ctx = toile.getContext('2d');
		let largeur = 0;
		let hauteur = 0;
		let points = [];
		const souris = { x: -9999, y: -9999 };

		const dimensionner = () => {
			const dpr = Math.min(window.devicePixelRatio || 1, 2);
			const rect = toile.getBoundingClientRect();
			largeur = rect.width;
			hauteur = rect.height;
			toile.width = Math.round(largeur * dpr);
			toile.height = Math.round(hauteur * dpr);
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

			const densite = largeur < 700 ? 34 : 78;
			points = Array.from({ length: densite }, () => ({
				x: Math.random() * largeur,
				y: Math.random() * hauteur,
				vx: (Math.random() - 0.5) * 0.16,
				vy: (Math.random() - 0.5) * 0.16,
				r: Math.random() * 1.5 + 0.4
			}));
		};

		const dessiner = () => {
			ctx.clearRect(0, 0, largeur, hauteur);

			for (const p of points) {
				p.x += p.vx;
				p.y += p.vy;

				if (p.x < -20) p.x = largeur + 20;
				if (p.x > largeur + 20) p.x = -20;
				if (p.y < -20) p.y = hauteur + 20;
				if (p.y > hauteur + 20) p.y = -20;

				const dx = p.x - souris.x;
				const dy = p.y - souris.y;
				const d = Math.hypot(dx, dy);

				if (d < 160 && d > 0.1) {
					p.x += (dx / d) * (160 - d) * 0.012;
					p.y += (dy / d) * (160 - d) * 0.012;
				}

				ctx.beginPath();
				ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
				ctx.fillStyle = `rgba(242,240,250,${0.05 + p.r * 0.09})`;
				ctx.fill();
			}

			// liaisons proches
			for (let i = 0; i < points.length; i++) {
				for (let j = i + 1; j < points.length; j++) {
					const a = points[i];
					const b = points[j];
					const d = Math.hypot(a.x - b.x, a.y - b.y);
					if (d < 118) {
						ctx.beginPath();
						ctx.moveTo(a.x, a.y);
						ctx.lineTo(b.x, b.y);
						ctx.strokeStyle = `rgba(123,61,255,${(1 - d / 118) * 0.14})`;
						ctx.lineWidth = 0.6;
						ctx.stroke();
					}
				}
			}

			requestAnimationFrame(dessiner);
		};

		dimensionner();
		requestAnimationFrame(dessiner);

		window.addEventListener('resize', dimensionner);

		window.addEventListener('pointermove', (e) => {
			const rect = toile.getBoundingClientRect();
			souris.x = e.clientX - rect.left;
			souris.y = e.clientY - rect.top;
		}, { passive: true });
	}

	/* ---------- 4. curseur ---------- */

	const curseur = document.getElementById('cursor');

	if (curseur && !sansSouris && !mouvementReduit) {
		let cx = window.innerWidth / 2;
		let cy = window.innerHeight / 2;
		let tx = cx;
		let ty = cy;

		window.addEventListener('pointermove', (e) => {
			tx = e.clientX;
			ty = e.clientY;
		}, { passive: true });

		const boucle = () => {
			cx = lerp(cx, tx, 0.18);
			cy = lerp(cy, ty, 0.18);
			curseur.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
			requestAnimationFrame(boucle);
		};
		requestAnimationFrame(boucle);

		document.querySelectorAll('[data-hover]').forEach((el) => {
			el.addEventListener('pointerenter', () => document.body.classList.add('cursor-actif'));
			el.addEventListener('pointerleave', () => document.body.classList.remove('cursor-actif'));
		});
	}

	/* ---------- 5. galerie horizontale pilotée au scroll ---------- */

	const section = document.getElementById('galerie');
	const rail = document.getElementById('rail');

	if (section && rail) {
		let horizontal = window.innerWidth > 900 && !mouvementReduit;

		const distance = () => Math.max(0, rail.scrollWidth - window.innerWidth + 40);

		const dimensionner = () => {
			horizontal = window.innerWidth > 900 && !mouvementReduit;
			if (horizontal) {
				section.style.height = `${window.innerHeight + distance()}px`;
			} else {
				section.style.height = '';
				rail.style.transform = '';
			}
		};

		const defiler = () => {
			if (!horizontal) return;
			const d = distance();
			const depart = section.offsetTop;
			const p = clamp((window.scrollY - depart) / (d || 1), 0, 1);
			rail.style.transform = `translate3d(${-p * d}px, 0, 0)`;
		};

		let attente = false;
		const surScroll = () => {
			if (attente) return;
			attente = true;
			requestAnimationFrame(() => {
				defiler();
				if (barre) {
					const total = document.documentElement.scrollHeight - window.innerHeight;
					barre.style.width = `${clamp(window.scrollY / (total || 1), 0, 1) * 100}%`;
				}
				attente = false;
			});
		};

		dimensionner();
		defiler();
		window.addEventListener('scroll', surScroll, { passive: true });
		window.addEventListener('resize', () => { dimensionner(); defiler(); });
		window.addEventListener('load', () => { dimensionner(); defiler(); });
	}

	/* ---------- 6. apparitions au scroll ---------- */

	const cibles = document.querySelectorAll('.portes, .pied, .bandeau');
	cibles.forEach((el) => el.classList.add('monte'));

	if ('IntersectionObserver' in window) {
		const obs = new IntersectionObserver((entrees) => {
			entrees.forEach((e) => {
				if (e.isIntersecting) {
					e.target.classList.add('vu');
					obs.unobserve(e.target);
				}
			});
		}, { threshold: 0.15 });
		cibles.forEach((el) => obs.observe(el));
	} else {
		cibles.forEach((el) => el.classList.add('vu'));
	}

	/* ---------- 7. aperçu flottant sur les portes ---------- */

	const apercu = document.getElementById('apercu');
	const imageApercu = apercu ? apercu.querySelector('img') : null;

	if (apercu && imageApercu && !sansSouris && !mouvementReduit) {
		document.querySelectorAll('[data-apercu]').forEach((lien) => {
			lien.addEventListener('pointerenter', () => {
				imageApercu.src = lien.dataset.apercu;
				apercu.classList.add('visible');
			});
			lien.addEventListener('pointerleave', () => apercu.classList.remove('visible'));
			lien.addEventListener('pointermove', (e) => {
				apercu.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%) scale(1)`;
			});
		});
	}

	/* ---------- 8. ancres internes ---------- */

	document.querySelectorAll('a[href^="#"]').forEach((a) => {
		a.addEventListener('click', (e) => {
			const cible = document.querySelector(a.getAttribute('href'));
			if (!cible) return;
			e.preventDefault();
			cible.scrollIntoView({ behavior: mouvementReduit ? 'auto' : 'smooth', block: 'start' });
		});
	});
})();
