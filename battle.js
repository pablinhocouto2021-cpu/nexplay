(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const canvas = $("gameCanvas");

  if (!window.THREE || !canvas) {
    alert("Não foi possível carregar o jogo 3D. Verifique sua conexão.");
    return;
  }

  // CENÁRIO 3D
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87bde8);
  scene.fog = new THREE.Fog(0x87bde8, 35, 100);

  const camera = new THREE.PerspectiveCamera(
    70, window.innerWidth / window.innerHeight, 0.1, 200
  );

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance"
    });
  } catch (error) {
    alert("Seu navegador não conseguiu iniciar os gráficos 3D. Atualize o navegador e tente novamente.");
    return;
  }

  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;

  scene.add(new THREE.HemisphereLight(0xffffff, 0x526477, 2));

  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.position.set(15, 25, 10);
  sun.castShadow = true;
  scene.add(sun);

  // CONFIGURAÇÕES
  const settings = {
    quality: "medium",
    sensitivity: 50,
    hudSize: 100,
    hudOpacity: 85
  };

  try {
    Object.assign(
      settings,
      JSON.parse(localStorage.getItem("nexplayBattleSettings") || "{}")
    );
  } catch (e) {}

  settings.quality = ["low", "medium", "high"].includes(settings.quality) ? settings.quality : "medium";
  settings.sensitivity = THREE.MathUtils.clamp(Number(settings.sensitivity) || 50, 1, 100);
  settings.hudSize = THREE.MathUtils.clamp(Number(settings.hudSize) || 100, 70, 130);
  settings.hudOpacity = THREE.MathUtils.clamp(Number(settings.hudOpacity) || 85, 30, 100);

  function saveSettings() {
    try {
      localStorage.setItem("nexplayBattleSettings", JSON.stringify(settings));
    } catch (e) {}
  }

  function applyGraphics() {
    const quality = settings.quality;

    renderer.setPixelRatio(
      Math.min(devicePixelRatio || 1, quality === "low" ? 1 : quality === "high" ? 2 : 1.5)
    );

    renderer.shadowMap.enabled = quality !== "low";
    sun.castShadow = quality !== "low";
    hemiIntensity();
  }

  function hemiIntensity() {
    scene.children.forEach(obj => {
      if (obj.isHemisphereLight) {
        obj.intensity = settings.quality === "low" ? 1.2 : 2;
      }
    });
  }

  // ARENA
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    new THREE.MeshStandardMaterial({ color: 0x477d45 })
  );

  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const grid = new THREE.GridHelper(100, 50, 0x71966a, 0x64865d);
  grid.position.y = 0.02;
  scene.add(grid);

  function createBox(x, y, z, sx, sy, sz, color) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(sx, sy, sz),
      new THREE.MeshStandardMaterial({ color })
    );

    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }

  createBox(0, 2, -25, 50, 4, 1, 0x52677b);
  createBox(0, 2, 25, 50, 4, 1, 0x52677b);
  createBox(-25, 2, 0, 1, 4, 50, 0x52677b);
  createBox(25, 2, 0, 1, 4, 50, 0x52677b);

  createBox(-7, 1, -5, 3, 2, 3, 0x7c8994);
  createBox(7, 1, -8, 3, 2, 3, 0x7c8994);
  createBox(-8, 1, 8, 3, 2, 3, 0x7c8994);
  createBox(8, 1, 7, 3, 2, 3, 0x7c8994);

  // CENÁRIO: árvores, pedras e arbustos leves, sem dependência de imagens externas.
  function createTree(x, z, scale = 1) {
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18 * scale, 0.25 * scale, 1.7 * scale, 7),
      new THREE.MeshStandardMaterial({ color: 0x705039, roughness: 1 })
    );
    trunk.position.set(x, 0.85 * scale, z);
    trunk.castShadow = true;
    scene.add(trunk);
    const crown = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.05 * scale, 1),
      new THREE.MeshStandardMaterial({ color: 0x267447, roughness: 1, flatShading: true })
    );
    crown.position.set(x, 2.0 * scale, z);
    crown.castShadow = true;
    scene.add(crown);
  }

  function createRock(x, z, scale = 1) {
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(scale, 0),
      new THREE.MeshStandardMaterial({ color: 0x687583, roughness: 1, flatShading: true })
    );
    rock.position.set(x, scale * 0.55, z);
    rock.rotation.set(0.2, x * 0.13, 0.35);
    rock.scale.y = 0.72;
    rock.castShadow = true;
    rock.receiveShadow = true;
    scene.add(rock);
  }

  [ [-19,-17,1.2],[-15,16,0.9],[18,-17,1.1],[19,15,1.25],[-21,2,0.8],[21,-2,0.9],[-12,-22,0.8],[12,22,0.8] ]
    .forEach(([x,z,s]) => createTree(x,z,s));
  [ [-13,-10,1.1],[13,-12,0.9],[-15,11,0.8],[15,12,1.2],[-3,-20,0.7],[4,20,0.7] ]
    .forEach(([x,z,s]) => createRock(x,z,s));

  // PERSONAGENS
  function createCharacter(color) {
    const group = new THREE.Group();
    const suit = new THREE.MeshStandardMaterial({ color, roughness: 0.72 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x182b46, roughness: 0.9 });
    const skin = new THREE.MeshStandardMaterial({ color: 0xffd0a0, roughness: 0.85 });

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 0.55, 4, 8), suit);
    body.position.y = 1.22;
    group.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 16), skin);
    head.position.y = 1.95;
    group.add(head);

    const leftArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.48, 3, 7), suit);
    leftArm.position.set(-0.5, 1.25, 0);
    leftArm.rotation.z = -0.12;
    group.add(leftArm);
    const rightArm = leftArm.clone();
    rightArm.position.x = 0.5;
    rightArm.rotation.z = 0.12;
    group.add(rightArm);

    const leftLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.48, 3, 7), dark);
    leftLeg.position.set(-0.2, 0.48, 0);
    group.add(leftLeg);
    const rightLeg = leftLeg.clone();
    rightLeg.position.x = 0.2;
    group.add(rightLeg);

    group.userData.anim = { body, head, leftArm, rightArm, leftLeg, rightLeg };
    group.traverse(obj => {
      if (obj.isMesh) { obj.castShadow = true; obj.receiveShadow = true; }
    });
    scene.add(group);
    return group;
  }

  const player = createCharacter(0x168cff);
  player.position.set(0, 0, 10);

  const bot = createCharacter(0xff4949);
  bot.position.set(0, 0, -10);

  const playerState = {
    health: 100,
    score: 0,
    verticalSpeed: 0,
    grounded: true,
    crouching: false,
    moving: false
  };

  const botState = {
    health: 100,
    score: 0,
    attackTimer: 0
  };

  let cameraYaw = 0;
  let cameraPitch = 0.15;
  let gameStarted = false;
  let lastTime = 0;
  let roundOver = false;

  // CÂMERA
  function updateCamera() {
    const distance = 6;
    const height = playerState.crouching ? 1.4 : 2.1;

    camera.position.set(
      player.position.x + Math.sin(cameraYaw) * distance,
      player.position.y + height + cameraPitch * 2,
      player.position.z + Math.cos(cameraYaw) * distance
    );

    camera.lookAt(
      player.position.x,
      player.position.y + 1.2,
      player.position.z
    );
  }

  // CONTROLES
  const keys = {};
  const movement = { x: 0, y: 0 };

  let runActive = false;
  let crouchActive = false;
  let jumpRequested = false;
  let shootRequested = false;
  let buildRequested = false;

  window.addEventListener("keydown", event => {
    keys[event.code] = true;

    if (event.code === "Space") {
      jumpRequested = true;
      event.preventDefault();
    }
  });

  window.addEventListener("keyup", event => {
    keys[event.code] = false;
  });

  function bindHold(id, callback) {
    const element = $(id);
    if (!element) return;

    element.addEventListener("pointerdown", event => {
      event.preventDefault();
      callback(true);
    });

    ["pointerup", "pointercancel", "pointerleave"].forEach(type => {
      element.addEventListener(type, () => callback(false));
    });
  }

  bindHold("runBtn", value => runActive = value);
  bindHold("crouchBtn", value => crouchActive = value);

  $("jumpBtn").addEventListener("pointerdown", () => {
    jumpRequested = true;
  });

  $("shootBtn").addEventListener("pointerdown", () => {
    shootRequested = true;
  });

  $("buildBtn").addEventListener("pointerdown", () => {
    buildRequested = true;
  });

  // JOYSTICK
  const joystick = $("joystick");
  const stick = $("stick");
  let joystickActive = false;

  function moveJoystick(event) {
    const rect = joystick.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let dx = event.clientX - centerX;
    let dy = event.clientY - centerY;

    const max = rect.width * 0.35;
    const length = Math.hypot(dx, dy);

    if (length > max) {
      dx = dx / length * max;
      dy = dy / length * max;
    }

    movement.x = dx / max;
    movement.y = dy / max;

    stick.style.left = `calc(50% + ${dx}px)`;
    stick.style.top = `calc(50% + ${dy}px)`;
  }

  joystick.addEventListener("pointerdown", event => {
    joystickActive = true;
    joystick.setPointerCapture(event.pointerId);
    moveJoystick(event);
  });

  joystick.addEventListener("pointermove", event => {
    if (joystickActive) moveJoystick(event);
  });

  function releaseJoystick() {
    joystickActive = false;
    movement.x = 0;
    movement.y = 0;
    stick.style.left = "50%";
    stick.style.top = "50%";
  }

  joystick.addEventListener("pointerup", releaseJoystick);
  joystick.addEventListener("pointercancel", releaseJoystick);

  // CÂMERA POR TOQUE
  let cameraPointer = null;
  let lastTouchX = 0;
  let lastTouchY = 0;

  canvas.addEventListener("pointerdown", event => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (event.clientX < innerWidth * 0.45) return;

    cameraPointer = event.pointerId;
    lastTouchX = event.clientX;
    lastTouchY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener("pointermove", event => {
    if (cameraPointer !== event.pointerId) return;

    const dx = event.clientX - lastTouchX;
    const dy = event.clientY - lastTouchY;
    const sensitivity = settings.sensitivity / 50;

    cameraYaw -= dx * 0.005 * sensitivity;
    cameraPitch -= dy * 0.003 * sensitivity;
    cameraPitch = Math.max(-0.6, Math.min(0.8, cameraPitch));

    lastTouchX = event.clientX;
    lastTouchY = event.clientY;
  });

  function releaseCamera(event) {
    if (cameraPointer === event.pointerId) cameraPointer = null;
  }

  canvas.addEventListener("pointerup", releaseCamera);
  canvas.addEventListener("pointercancel", releaseCamera);
  canvas.addEventListener("lostpointercapture", releaseCamera);

  // DISPAROS DE ENERGIA
  const projectiles = [];

  function shootEnergy(from, target) {
    const projectile = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0x00eaff })
    );

    projectile.position.copy(from.position);
    projectile.position.y += 1.5;

    const destination = target.position.clone();
    destination.y += 1.2;

    const direction = destination.sub(projectile.position).normalize();

    scene.add(projectile);

    projectiles.push({
      mesh: projectile,
      direction,
      target,
      life: 2
    });
  }

  function updateProjectiles(delta) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];

      p.mesh.position.addScaledVector(p.direction, 22 * delta);
      p.life -= delta;

      const targetPosition = p.target.position.clone();
      targetPosition.y += 1;

      if (p.mesh.position.distanceTo(targetPosition) < 0.9) {
        if (p.target === bot && botState.health > 0) {
          botState.health = Math.max(0, botState.health - 20);
        }

        if (p.target === player && playerState.health > 0) {
          playerState.health = Math.max(0, playerState.health - 10);
        }

        p.life = 0;
      }

      if (p.life <= 0) {
        scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        projectiles.splice(i, 1);
      }
    }
  }

  // CONSTRUÇÕES
  const builds = [];

  function buildWall() {
    const direction = new THREE.Vector3(
      -Math.sin(cameraYaw), 0, -Math.cos(cameraYaw)
    );

    const position = player.position.clone().addScaledVector(direction, 3);

    const wall = createBox(
      position.x, 1.5, position.z,
      3, 3, 0.25, 0x38aaff
    );

    builds.push(wall);

    if (builds.length > 12) {
      const old = builds.shift();
      scene.remove(old);
      old.geometry.dispose();
      old.material.dispose();
    }
  }

  // INTERFACE
  function showMessage(message) {
    $("message").textContent = message;
  }

  function updateHealth() {
    $("playerHealth").style.width = playerState.health + "%";
    $("botHealth").style.width = botState.health + "%";
    $("score").textContent = playerState.score + " × " + botState.score;
  }

  function finishRound(winner) {
    if (roundOver) return;
    roundOver = true;

    if (winner === "player") {
      playerState.score++;
      showMessage("Você venceu a rodada!");
    } else {
      botState.score++;
      showMessage("O bot venceu a rodada!");
    }

    updateHealth();

    setTimeout(() => {
      playerState.health = 100;
      botState.health = 100;
      player.position.set(0, 0, 10);
      bot.position.set(0, 0, -10);
      roundOver = false;
      updateHealth();
      showMessage("Nova rodada!");
    }, 1800);
  }

  // MOVIMENTAÇÃO
  function updatePlayer(delta) {
    const forward =
      (keys.KeyW ? 1 : 0) -
      (keys.KeyS ? 1 : 0) -
      movement.y;

    const sideways =
      (keys.KeyD ? 1 : 0) -
      (keys.KeyA ? 1 : 0) +
      movement.x;

    const running = runActive || keys.ShiftLeft || keys.ShiftRight;
    playerState.crouching = crouchActive || keys.ControlLeft;

    const speed = playerState.crouching ? 2 : running ? 10 : 5;

    const direction = new THREE.Vector3(
      Math.sin(cameraYaw),
      0,
      Math.cos(cameraYaw)
    );

    const right = new THREE.Vector3(
      Math.cos(cameraYaw),
      0,
      -Math.sin(cameraYaw)
    );

    const velocity = direction.multiplyScalar(-forward)
      .add(right.multiplyScalar(sideways));

    if (velocity.length() > 1) velocity.normalize();
    playerState.moving = velocity.length() > 0.04;

    player.position.addScaledVector(velocity, speed * delta);

    player.position.x = THREE.MathUtils.clamp(player.position.x, -23, 23);
    player.position.z = THREE.MathUtils.clamp(player.position.z, -23, 23);

    if (jumpRequested && playerState.grounded) {
      playerState.verticalSpeed = 8;
      playerState.grounded = false;
    }

    jumpRequested = false;

    playerState.verticalSpeed -= 20 * delta;
    player.position.y += playerState.verticalSpeed * delta;

    if (player.position.y <= 0) {
      player.position.y = 0;
      playerState.verticalSpeed = 0;
      playerState.grounded = true;
    }

    if (velocity.length() > 0.01) {
      player.rotation.y = Math.atan2(velocity.x, velocity.z);
    }

    if (shootRequested) {
      shootEnergy(player, bot);
      shootRequested = false;
    }

    if (buildRequested) {
      buildWall();
      buildRequested = false;
    }
  }

  // BOT
  function updateBot(delta) {
    if (botState.health <= 0 || playerState.health <= 0) return;

    const distance = bot.position.distanceTo(player.position);

    if (distance > 4) {
      const direction = player.position.clone()
        .sub(bot.position)
        .normalize();

      bot.position.addScaledVector(direction, 2.5 * delta);
      bot.rotation.y = Math.atan2(direction.x, direction.z);
    }

    botState.attackTimer -= delta;

    if (distance < 14 && botState.attackTimer <= 0) {
      shootEnergy(bot, player);
      botState.attackTimer = 2;
    }
  }

  // CONFIGURAÇÕES
  const settingsPanel = $("settingsPanel");

  $("settingsBtn").addEventListener("click", () => {
    settingsPanel.hidden = false;
  });

  $("closeSettings").addEventListener("click", () => {
    settingsPanel.hidden = true;
  });

  $("resumeBtn").addEventListener("click", () => {
    settingsPanel.hidden = true;
  });

  document.querySelectorAll("[data-tab]").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-tab]").forEach(item => {
        item.classList.remove("active");
      });

      button.classList.add("active");

      document.querySelectorAll(".tab-panel").forEach(panel => {
        panel.hidden = true;
      });

      const panel = $(button.dataset.tab);
      if (panel) panel.hidden = false;
    });
  });

  $("graphicsQuality").value = settings.quality;
  $("graphicsQuality").addEventListener("change", event => {
    settings.quality = event.target.value;
    applyGraphics();
    saveSettings();
  });

  $("sensitivityValue").value = settings.sensitivity;
  $("sensitivityLabel").textContent = settings.sensitivity + "%";

  $("sensitivityValue").addEventListener("input", event => {
    settings.sensitivity = Number(event.target.value);
    $("sensitivityLabel").textContent = settings.sensitivity + "%";
    saveSettings();
  });

  $("hudSize").value = settings.hudSize;
  $("hudOpacity").value = settings.hudOpacity;

  function applyHUD() {
    document.documentElement.style.setProperty(
      "--hud-size", settings.hudSize / 100
    );

    document.documentElement.style.setProperty(
      "--hud-opacity", settings.hudOpacity / 100
    );

    $("hudSizeValue").textContent = settings.hudSize + "%";
    $("hudOpacityValue").textContent = settings.hudOpacity + "%";
  }

  $("hudSize").addEventListener("input", event => {
    settings.hudSize = Number(event.target.value);
    applyHUD();
    saveSettings();
  });

  $("hudOpacity").addEventListener("input", event => {
    settings.hudOpacity = Number(event.target.value);
    applyHUD();
    saveSettings();
  });

  applyHUD();
  applyGraphics();
  resizeGame();

  // TELA CHEIA E ORIENTAÇÃO
  $("fullscreenBtn").addEventListener("click", async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();

        if (screen.orientation && screen.orientation.lock) {
          await screen.orientation.lock("landscape").catch(() => {});
        }
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      showMessage("Tela cheia não disponível neste navegador.");
    }
  });

  // INICIAR PARTIDA
  $("startBtn").addEventListener("click", () => {
    $("startScreen").hidden = true;
    gameStarted = true;
    showMessage("Partida iniciada!");
  });

  // LOOP DO JOGO
  function animate(time) {
    requestAnimationFrame(animate);

    const delta = Math.min((time - lastTime) / 1000 || 0, 0.05);
    lastTime = time;

    if (gameStarted && !roundOver) {
      updatePlayer(delta);
      updateBot(delta);
      updateProjectiles(delta);

      if (botState.health <= 0) {
        finishRound("player");
      } else if (playerState.health <= 0) {
        finishRound("bot");
      }

      updateHealth();
    }

    const walkCycle = time * 0.009;
    const playerAnim = player.userData.anim;
    const botAnim = bot.userData.anim;
    const playerSwing = playerState.moving ? Math.sin(walkCycle) * 0.48 : Math.sin(walkCycle * 0.35) * 0.035;
    const botMoving = botState.health > 0 && playerState.health > 0 && bot.position.distanceTo(player.position) > 4.2;
    const botSwing = botMoving ? Math.sin(walkCycle * 0.75) * 0.34 : Math.sin(walkCycle * 0.25) * 0.025;
    if (playerAnim) {
      playerAnim.leftArm.rotation.x = playerSwing;
      playerAnim.rightArm.rotation.x = -playerSwing;
      playerAnim.leftLeg.rotation.x = -playerSwing * 0.8;
      playerAnim.rightLeg.rotation.x = playerSwing * 0.8;
      playerAnim.head.rotation.y = Math.sin(walkCycle * 0.2) * 0.025;
    }
    if (botAnim) {
      botAnim.leftArm.rotation.x = botSwing;
      botAnim.rightArm.rotation.x = -botSwing;
      botAnim.leftLeg.rotation.x = -botSwing * 0.7;
      botAnim.rightLeg.rotation.x = botSwing * 0.7;
    }

    updateCamera();
    renderer.render(scene, camera);
  }

  function resizeGame() {
    const width = Math.max(1, canvas.clientWidth || innerWidth);
    const height = Math.max(1, canvas.clientHeight || innerHeight);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, settings.quality === "low" ? 1 : settings.quality === "high" ? 1.5 : 1.25));
    renderer.setSize(width, height, false);
  }

  window.addEventListener("resize", resizeGame, { passive: true });
  if (window.visualViewport) window.visualViewport.addEventListener("resize", resizeGame, { passive: true });

  updateHealth();
  updateCamera();
  requestAnimationFrame(animate);

})();