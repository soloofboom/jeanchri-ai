/* ai.jeanchri.com : interactions
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

		const debut = performance.now();
		const duree = 1300;

		const tic = (maintenant) => {
			const p = clamp((maintenant - debut) / duree, 0, 1);
			compteur.textContent = String(Math.round(p * 100)).padStart(2, '0');
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

	/* ---------- 3. pluie de caractères à droite du hero ---------- */

	const toile = document.getElementById('portrait');

	if (toile) {
		const ctx = toile.getContext('2d');
		const JEU = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*+=<>/\\|_-.:;!?[]{}()^~";
		const caractere = () => JEU[Math.floor(Math.random() * JEU.length)];

		let L = 0;
		let H = 0;
		let poussieres = [];
		let asciiFond = null;
		let asciiCtx = null;
		let cases = [];
		let gouttes = [];
		let cols = 0;
		let rangs = 0;
		let celW = 0;
		let celH = 0;
		let dernierTemps = 0;
		const curseur = { x: -9999, y: -9999, dans: false };
		
		let cadres = { x: 0, y: 0, w: 0, h: 0 };
		let decalage = 0;
		let decalageCible = 0;

		const construire = () => {
			const dpr = Math.min(window.devicePixelRatio || 1, 2);
			const rect = toile.getBoundingClientRect();
			L = rect.width;
			H = rect.height;
			toile.width = Math.round(L * dpr);
			toile.height = Math.round(H * dpr);
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			cadres = { x: 0, y: 0, w: L, h: H };

			// pluie de caractères : grille de colonnes, tête lumineuse + traînée
			celW = Math.max(8, Math.round(cadres.w / 64));
			celH = Math.round(celW * 1.85);
			cols = Math.max(1, Math.floor(cadres.w / celW));
			rangs = Math.max(1, Math.floor(cadres.h / celH));
			asciiFond = document.createElement('canvas');
			asciiFond.width = cols * celW;
			asciiFond.height = rangs * celH;
			asciiCtx = asciiFond.getContext('2d');
			asciiCtx.font = `${(celW / 0.6).toFixed(1)}px "JetBrains Mono", ui-monospace, monospace`;
			asciiCtx.textBaseline = 'top';
			cases = Array.from({ length: cols * rangs }, caractere);
			gouttes = Array.from({ length: cols }, () => ({
				y: Math.random() * (rangs + 10) - 10,
				v: 8 + Math.random() * 12,
				len: 8 + Math.floor(Math.random() * 15)
			}));

			poussieres = Array.from({ length: L < 520 ? 16 : 30 }, () => ({
				x: Math.random() * L,
				y: Math.random() * H,
				vx: (Math.random() - 0.5) * 0.1,
				vy: (Math.random() - 0.5) * 0.1,
				r: Math.random() * 1.2 + 0.3
			}));
		};

		// une colonne de pluie = une tête qui descend, suivie d'une traînée
		const dessinerPluie = (dt, survol) => {
			if (!asciiCtx) return;
			const cf = asciiCtx;
			cf.clearRect(0, 0, asciiFond.width, asciiFond.height);

			for (let c = 0; c < cols; c++) {
				const g = gouttes[c];
				g.y += g.v * dt;
				if (g.y - g.len > rangs) {
					g.y = -Math.random() * rangs * 0.5;
					g.v = 8 + Math.random() * 12;
					g.len = 8 + Math.floor(Math.random() * 15);
				}

				const tete = Math.floor(g.y);
				for (let k = 0; k < g.len; k++) {
					const r = tete - k;
					if (r < 0 || r >= rangs) continue;

					const f = 1 - k / g.len;
					const a = Math.pow(f, 1.6) * 0.92;
					let couleur;
					if (k === 0) couleur = `rgba(232,206,255,${a.toFixed(3)})`;
					else if (k < 3) couleur = `rgba(198,150,255,${a.toFixed(3)})`;
					else couleur = `rgba(146,80,255,${(a * 0.85).toFixed(3)})`;

					cf.fillStyle = couleur;
					cf.fillText(cases[c * rangs + r], c * celW, r * celH);
				}
			}

			// sous le curseur, les signes s'allument (même hors des traînées)
			if (survol) {
				const c0 = Math.max(0, Math.floor((survol.x - survol.r) / celW));
				const c1 = Math.min(cols - 1, Math.ceil((survol.x + survol.r) / celW));
				const r0 = Math.max(0, Math.floor((survol.y - survol.r) / celH));
				const r1 = Math.min(rangs - 1, Math.ceil((survol.y + survol.r) / celH));
				cf.shadowColor = 'rgba(198,158,255,.9)';
				cf.shadowBlur = 9;
				for (let c = c0; c <= c1; c++) {
					for (let r = r0; r <= r1; r++) {
						const dx = c * celW + celW / 2 - survol.x;
						const dy = r * celH + celH / 2 - survol.y;
						const d = Math.hypot(dx, dy);
						if (d > survol.r) continue;
						const e = 1 - d / survol.r;
						cf.fillStyle = `rgba(240,228,255,${(e * e * 1.05).toFixed(3)})`;
						cf.fillText(cases[c * rangs + r], c * celW, r * celH);
					}
				}
				cf.shadowBlur = 0;
			}

			const mutations = Math.max(1, Math.round(cols * rangs * 0.012));
			for (let i = 0; i < mutations; i++) {
				cases[Math.floor(Math.random() * cases.length)] = caractere();
			}
		};

		const dessiner = (temps) => {
			const dt = Math.min(0.05, Math.max(0, (temps - dernierTemps) / 1000));
			dernierTemps = temps;

			ctx.clearRect(0, 0, L, H);

			const souffle = Math.sin(temps * 0.0004) * 2.2;
			curseur.dans =
				curseur.x > -9999 && curseur.x >= 0 && curseur.x <= L && curseur.y >= 0 && curseur.y <= H;
			const balayage = ((temps * 0.000055) % 1.25) - 0.12;
			const rayonEclat = Math.min(cadres.w, cadres.h) * 0.26;

			dessinerPluie(
				dt,
				curseur.dans
					? {
							x: curseur.x - decalage - cadres.x,
							y: curseur.y - souffle - cadres.y,
							r: rayonEclat
						}
					: null
			);

			ctx.save();
			ctx.translate(decalage, souffle);

			// halo
			const hx = cadres.x + cadres.w * 0.5;
			const hy = cadres.y + cadres.h * 0.28;
			const halo = ctx.createRadialGradient(hx, hy, 0, hx, hy, cadres.h * 0.42);
			halo.addColorStop(0, 'rgba(85,0,232,.13)');
			halo.addColorStop(0.6, 'rgba(85,0,232,.035)');
			halo.addColorStop(1, 'rgba(85,0,232,0)');
			ctx.fillStyle = halo;
			ctx.beginPath();
			ctx.arc(hx, hy, cadres.h * 0.42, 0, Math.PI * 2);
			ctx.fill();

			// poussières
			for (const p of poussieres) {
				p.x += p.vx;
				p.y += p.vy;
				if (p.x < -10) p.x = L + 10;
				if (p.x > L + 10) p.x = -10;
				if (p.y < -10) p.y = H + 10;
				if (p.y > H + 10) p.y = -10;
				ctx.beginPath();
				ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
				ctx.fillStyle = `rgba(242,240,250,${0.04 + p.r * 0.05})`;
				ctx.fill();
			}

			// la pluie mauve
			if (asciiFond) {
				ctx.globalAlpha = 0.8;
				ctx.drawImage(asciiFond, cadres.x, cadres.y, asciiFond.width, asciiFond.height);
				ctx.globalAlpha = 1;
			}

			// halo + repassage additif : les signes brillent sous le curseur
			if (curseur.dans && asciiFond) {
				const hcx = curseur.x - decalage;
				const hcy = curseur.y - souffle;
				const haloCurseur = ctx.createRadialGradient(hcx, hcy, 0, hcx, hcy, rayonEclat);
				haloCurseur.addColorStop(0, 'rgba(160,110,255,.20)');
				haloCurseur.addColorStop(0.55, 'rgba(123,61,255,.08)');
				haloCurseur.addColorStop(1, 'rgba(123,61,255,0)');
				ctx.fillStyle = haloCurseur;
				ctx.beginPath();
				ctx.arc(hcx, hcy, rayonEclat, 0, Math.PI * 2);
				ctx.fill();

				ctx.save();
				ctx.beginPath();
				ctx.arc(hcx, hcy, rayonEclat, 0, Math.PI * 2);
				ctx.clip();
				ctx.globalCompositeOperation = 'lighter';
				ctx.globalAlpha = 0.35;
				ctx.drawImage(asciiFond, cadres.x, cadres.y, asciiFond.width, asciiFond.height);
				ctx.restore();
			}

			// bande de balayage
			const yBalayage = cadres.y + balayage * cadres.h;
			const gradBalayage = ctx.createLinearGradient(0, yBalayage - cadres.h * 0.06, 0, yBalayage + cadres.h * 0.06);
			gradBalayage.addColorStop(0, 'rgba(123,61,255,0)');
			gradBalayage.addColorStop(0.5, 'rgba(160,110,255,.16)');
			gradBalayage.addColorStop(1, 'rgba(123,61,255,0)');
			ctx.fillStyle = gradBalayage;
			ctx.fillRect(cadres.x, yBalayage - cadres.h * 0.06, cadres.w, cadres.h * 0.12);

			ctx.restore();

			if (!mouvementReduit) {
				decalage = decalage + (decalageCible - decalage) * 0.05;
				requestAnimationFrame(dessiner);
			}
		};

		const dimensionner = () => {
			construire();
			decalage = 0;
			if (mouvementReduit) dessiner(performance.now());
		};

		dimensionner();
		if (!mouvementReduit) requestAnimationFrame(dessiner);

		window.addEventListener('resize', dimensionner);
		if (document.fonts && document.fonts.ready) document.fonts.ready.then(dimensionner);

		if (!sansSouris && !mouvementReduit) {
			window.addEventListener('pointermove', (e) => {
				decalageCible = ((e.clientX / window.innerWidth) - 0.5) * -14;
				const rect = toile.getBoundingClientRect();
				curseur.x = e.clientX - rect.left;
				curseur.y = e.clientY - rect.top;
			}, { passive: true });

			window.addEventListener('pointerleave', () => { curseur.dans = false; });
		}
	}

	/* ---------- 4. curseur + cadre de détection ---------- */

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

	const cadre = document.getElementById('cadre');

	if (cadre && !sansSouris && !mouvementReduit) {
		const cibles = document.querySelectorAll('[data-detect], [data-texte] p');

		cibles.forEach((el) => {
			el.addEventListener('pointerenter', () => {
				const r = el.getBoundingClientRect();
				const marge = 10;
				cadre.style.left = `${r.left - marge}px`;
				cadre.style.top = `${r.top - marge}px`;
				cadre.style.width = `${r.width + marge * 2}px`;
				cadre.style.height = `${r.height + marge * 2}px`;
				cadre.classList.add('actif');
			});
			el.addEventListener('pointerleave', () => cadre.classList.remove('actif'));
		});

		window.addEventListener('scroll', () => cadre.classList.remove('actif'), { passive: true });
	}

	/* ---------- 5. galerie horizontale pilotée au scroll ---------- */

	const section = document.getElementById('galerie');
	const rail = document.getElementById('rail');

	if (section && rail) {
		let horizontal = false;

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

	const ciblesApparition = document.querySelectorAll('.alibi, .portes, .pied');
	ciblesApparition.forEach((el) => el.classList.add('monte'));

	if ('IntersectionObserver' in window) {
		const obs = new IntersectionObserver((entrees) => {
			entrees.forEach((e) => {
				if (e.isIntersecting) {
					e.target.classList.add('vu');
					obs.unobserve(e.target);
				}
			});
		}, { threshold: 0.15 });
		ciblesApparition.forEach((el) => obs.observe(el));
	} else {
		ciblesApparition.forEach((el) => el.classList.add('vu'));
	}

	/* ---------- 7. texte qui s'écrit tout seul ---------- */

	const conteneurTexte = document.querySelector('[data-texte]');

	if (conteneurTexte && !mouvementReduit) {
		const paragraphes = Array.from(conteneurTexte.querySelectorAll('p'))
			.filter((p) => !p.classList.contains('alibi-signature'));

		const lettres = [];

		paragraphes.forEach((p) => {
			const texte = p.textContent.replace(/\s+/g, ' ').trim();
			p.textContent = '';
			p.setAttribute('aria-label', texte);

			for (const ch of texte) {
				const span = document.createElement('span');
				span.textContent = ch;
				span.style.color = 'rgba(242,240,250,.22)';
				p.appendChild(span);
				lettres.push(span);
			}
		});

		let index = 0;
		let enCours = false;
		let dernier = 0;

		const ecrire = (temps) => {
			if (!enCours) return;
			const ecart = temps - dernier;
			if (ecart > 14) {
				const pas = Math.max(1, Math.round(ecart / 4));
				for (let i = 0; i < pas && index < lettres.length; i++) {
					lettres[index].style.color = '';
					index++;
				}
				dernier = temps;
			}
			if (index < lettres.length) requestAnimationFrame(ecrire);
			else enCours = false;
		};

		const lancer = () => {
			if (enCours || index >= lettres.length) return;
			enCours = true;
			dernier = performance.now();
			requestAnimationFrame(ecrire);
		};

		if ('IntersectionObserver' in window) {
			const obsTexte = new IntersectionObserver((entrees) => {
				entrees.forEach((e) => {
					if (e.isIntersecting) {
						lancer();
						obsTexte.disconnect();
					}
				});
			}, { threshold: 0.2 });
			obsTexte.observe(conteneurTexte);
		} else {
			lancer();
		}
	}

	/* ---------- 8. mémoire du visiteur (localStorage, rien d'envoyé) ---------- */

	const memoire = document.getElementById('memoire');

	if (memoire) {
		const cle = 'ai.jeanchri.visite';
		const maintenant = Date.now();
		let etat = null;

		try {
			etat = JSON.parse(localStorage.getItem(cle) || 'null');
		} catch (e) {
			etat = null;
		}

		let texte = '';

		if (!etat || !etat.derniere) {
			texte = 'première visite, je note l’heure';
			etat = { premiere: maintenant, derniere: maintenant, visites: 1 };
		} else {
			const jours = Math.floor((maintenant - etat.derniere) / 86400000);
			const heures = Math.floor((maintenant - etat.derniere) / 3600000);
			etat.derniere = maintenant;
			etat.visites = (etat.visites || 1) + 1;

			if (heures < 1) texte = `visite n°${etat.visites} · il y a quelques minutes`;
			else if (jours < 1) texte = `visite n°${etat.visites} · il y a ${heures} heure${heures > 1 ? 's' : ''}`;
			else if (jours === 1) texte = `visite n°${etat.visites} · tu reviens après un jour`;
			else if (jours < 60) texte = `visite n°${etat.visites} · tu reviens après ${jours} jours`;
			else texte = `visite n°${etat.visites} · ça faisait longtemps`;
		}

		memoire.textContent = texte;
		memoire.hidden = false;

		try {
			localStorage.setItem(cle, JSON.stringify(etat));
		} catch (e) { /* navigation privée : on n'insiste pas */ }
	}

	/* ---------- 9. aperçu flottant sur les portes ---------- */

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

	/* ---------- 10. ancres internes ---------- */

	document.querySelectorAll('a[href^="#"]').forEach((a) => {
		a.addEventListener('click', (e) => {
			const cible = document.querySelector(a.getAttribute('href'));
			if (!cible) return;
			e.preventDefault();
			cible.scrollIntoView({ behavior: mouvementReduit ? 'auto' : 'smooth', block: 'start' });
		});
	});
})();
