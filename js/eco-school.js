(function () {
  'use strict';

  const section = document.getElementById('smart-eco-school');
  if (!section) return;

  const visual = document.getElementById('eco-school-visual');
  const canvas = document.getElementById('eco-school-canvas');
  const status = document.getElementById('eco-visual-status');
  const tabs = Array.from(section.querySelectorAll('[data-eco-pillar]'));
  const panels = Array.from(section.querySelectorAll('[data-eco-panel]'));
  const fallbackAreas = {
    green: section.querySelector('.eco-building--garden'),
    digital: section.querySelector('.eco-building--digital'),
    clubs: section.querySelector('.eco-building--club'),
    community: section.querySelector('.eco-building--community')
  };

  let activePillar = 'green';
  let model = null;
  let loadStarted = false;

  function setStatus(key, arabicFallback) {
    status.dataset.translate = key;
    const lang = document.documentElement.lang || 'ar';
    const translated = window.TRANSLATIONS && window.TRANSLATIONS[lang] && window.TRANSLATIONS[lang][key];
    status.textContent = translated || arabicFallback;
  }

  function selectPillar(pillar, focusTab) {
    activePillar = pillar;
    tabs.forEach((tab) => {
      const selected = tab.dataset.ecoPillar === pillar;
      tab.classList.toggle('is-selected', selected);
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected && focusTab) tab.focus();
    });
    panels.forEach((panel) => {
      panel.hidden = panel.dataset.ecoPanel !== pillar;
    });
    Object.entries(fallbackAreas).forEach(([name, element]) => {
      if (element) element.classList.toggle('is-highlighted', name === pillar);
    });
    if (model) model.select(pillar);
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectPillar(tab.dataset.ecoPillar));
    tab.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      let nextIndex = index;
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = tabs.length - 1;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (index + 1) % tabs.length;
      selectPillar(tabs[nextIndex].dataset.ecoPillar, true);
    });
  });

  selectPillar(activePillar);

  function showFallback() {
    if (model) model.dispose();
    model = null;
    visual.classList.remove('is-three-ready');
    setStatus('programs_eco_visual_fallback', 'تعذر عرض النموذج التفاعلي؛ يظل التصور الثابت وجميع الشروحات متاحة.');
  }

  async function loadModel() {
    if (loadStarted) return;
    loadStarted = true;

    try {
      if (!window.WebGLRenderingContext) throw new Error('WebGL unavailable');
      const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js');
      model = createEcoSchoolModel(THREE, canvas, showFallback);
      model.select(activePillar);
      visual.classList.add('is-three-ready');
      setStatus('programs_eco_visual_ready', 'النموذج التصوري التفاعلي جاهز. استخدموا الأزرار الأربعة لإبراز كل فضاء.');
    } catch (error) {
      showFallback();
    }
  }

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      loadModel();
    }, { rootMargin: '240px 0px' });
    observer.observe(section);
  } else {
    loadModel();
  }

  function createEcoSchoolModel(THREE, targetCanvas, onContextFailure) {
    const renderer = new THREE.WebGLRenderer({
      canvas: targetCanvas,
      alpha: true,
      antialias: true,
      powerPreference: 'low-power'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-6, 6, 5, -5, 0.1, 50);
    camera.position.set(9, 9, 11);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.HemisphereLight(0xfff9eb, 0x718077, 2.2));
    const sun = new THREE.DirectionalLight(0xffffff, 2.5);
    sun.position.set(5, 10, 7);
    scene.add(sun);

    const palette = {
      ivory: 0xfff7e8,
      cream: 0xf3e6c8,
      green: 0x3f8b62,
      darkGreen: 0x24583f,
      burgundy: 0x8f2538,
      gold: 0xc49a45,
      blue: 0x7ca5a1,
      ground: 0xdce5da,
      path: 0xd8c9aa
    };

    function material(color) {
      return new THREE.MeshStandardMaterial({ color, roughness: 0.78, metalness: 0 });
    }

    function mesh(geometry, color, position, group, rotation) {
      const item = new THREE.Mesh(geometry, material(color));
      item.position.set(position[0], position[1], position[2]);
      if (rotation) item.rotation.set(rotation[0], rotation[1], rotation[2]);
      (group || scene).add(item);
      return item;
    }

    mesh(new THREE.BoxGeometry(11, .35, 8), palette.ground, [0, -.25, 0]);
    mesh(new THREE.BoxGeometry(2.2, .12, 7.3), palette.path, [0, 0, .2]);

    const school = new THREE.Group();
    scene.add(school);
    mesh(new THREE.BoxGeometry(4.8, 2.1, 2.3), palette.ivory, [0, 1.05, -.9], school);
    mesh(new THREE.ConeGeometry(3.2, 1.05, 4), palette.burgundy, [0, 2.55, -.9], school, [0, Math.PI / 4, 0]);
    mesh(new THREE.BoxGeometry(.75, 1.35, .12), palette.darkGreen, [0, .72, .3], school);
    [-1.6, 1.6].forEach((x) => mesh(new THREE.BoxGeometry(.85, .72, .12), palette.blue, [x, 1.3, .3], school));

    const areas = {
      green: new THREE.Group(),
      digital: new THREE.Group(),
      clubs: new THREE.Group(),
      community: new THREE.Group()
    };
    Object.values(areas).forEach((group) => scene.add(group));

    mesh(new THREE.BoxGeometry(3.2, .18, 2.5), palette.green, [-3.7, .03, 2.1], areas.green);
    [[-4.4, 2.25], [-3.4, 1.6], [-2.8, 2.65]].forEach(([x, z]) => {
      mesh(new THREE.CylinderGeometry(.12, .18, .85, 8), palette.darkGreen, [x, .52, z], areas.green);
      mesh(new THREE.ConeGeometry(.52, 1.15, 8), palette.green, [x, 1.28, z], areas.green);
    });

    mesh(new THREE.BoxGeometry(2.8, 1.45, 1.7), palette.cream, [3.75, .72, -1.75], areas.digital);
    mesh(new THREE.BoxGeometry(1.45, .75, .08), palette.blue, [3.75, .93, -.86], areas.digital);
    mesh(new THREE.BoxGeometry(.2, .2, 1.15), palette.gold, [2.55, .16, -1.75], areas.digital);

    mesh(new THREE.CylinderGeometry(1.55, 1.55, .18, 20), palette.cream, [2.85, .04, 2.45], areas.clubs);
    [[2.25, 2.2], [3.45, 2.2], [2.85, 3]].forEach(([x, z]) => {
      mesh(new THREE.CylinderGeometry(.18, .18, .5, 10), palette.gold, [x, .34, z], areas.clubs);
    });

    mesh(new THREE.BoxGeometry(2.6, .16, 1.8), palette.burgundy, [-3.65, .04, -2.6], areas.community);
    [[-4.35, -2.6], [-3.65, -2.6], [-2.95, -2.6]].forEach(([x, z]) => {
      mesh(new THREE.CylinderGeometry(.25, .25, .48, 12), palette.ivory, [x, .33, z], areas.community);
    });
    mesh(new THREE.BoxGeometry(2.2, .16, 1.45), palette.gold, [-3.65, 1.35, -2.6], areas.community);
    [[-4.55, -3.15], [-2.75, -3.15], [-4.55, -2.05], [-2.75, -2.05]].forEach(([x, z]) => {
      mesh(new THREE.CylinderGeometry(.06, .06, 1.35, 8), palette.darkGreen, [x, .7, z], areas.community);
    });

    let selected = 'green';

    function resize() {
      const width = Math.max(targetCanvas.clientWidth, 1);
      const height = Math.max(targetCanvas.clientHeight, 1);
      const aspect = width / height;
      const size = 5.8;
      camera.left = -size * aspect;
      camera.right = size * aspect;
      camera.top = size;
      camera.bottom = -size;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      render();
    }

    function render() {
      renderer.render(scene, camera);
    }

    function select(name) {
      selected = name;
      Object.entries(areas).forEach(([areaName, group]) => {
        const active = areaName === selected;
        group.scale.setScalar(active ? 1.06 : 1);
        group.traverse((object) => {
          if (!object.isMesh || !object.material || !('emissive' in object.material)) return;
          object.material.emissive.set(active ? palette.gold : 0x000000);
          object.material.emissiveIntensity = active ? .22 : 0;
        });
      });
      render();
    }

    const contextLost = (event) => {
      event.preventDefault();
      onContextFailure();
    };
    targetCanvas.addEventListener('webglcontextlost', contextLost, false);

    const resizeObserver = 'ResizeObserver' in window ? new ResizeObserver(resize) : null;
    if (resizeObserver) resizeObserver.observe(targetCanvas.parentElement);
    else window.addEventListener('resize', resize);

    resize();

    function dispose() {
      if (resizeObserver) resizeObserver.disconnect();
      else window.removeEventListener('resize', resize);
      targetCanvas.removeEventListener('webglcontextlost', contextLost, false);
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((item) => item.dispose());
        }
      });
      renderer.dispose();
    }

    return { select, dispose };
  }

  window.addEventListener('pagehide', (event) => {
    if (!event.persisted && model) model.dispose();
  });
})();
