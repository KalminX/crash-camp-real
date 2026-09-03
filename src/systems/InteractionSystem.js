import * as THREE from 'three';

/**
 * InteractionSystem — Raycasts from center of camera to detect logs and campfire.
 * Executes pickup and refueling actions.
 */
export class InteractionSystem {
  constructor(camera, hud, audioSystem, worldGenerator, sessionStats) {
    this.camera = camera;
    this.hud = hud;
    this.audioSystem = audioSystem;
    this.worldGenerator = worldGenerator;
    this.sessionStats = sessionStats;

    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 3.6;
    this.centerScreen = new THREE.Vector2(0, 0); // screen center
  }

  update(world, dt) {
    const players = world.query('PlayerInput', 'Inventory', 'Transform');
    if (players.length === 0) return;

    const playerId = players[0];
    const input = world.getComponent(playerId, 'PlayerInput');
    const inventory = world.getComponent(playerId, 'Inventory');
    const playerTransform = world.getComponent(playerId, 'Transform');

    // Raycast from camera center forward
    this.raycaster.setFromCamera(this.centerScreen, this.camera);

    const interactables = world.query('Interactable', 'Transform');
    let closestInteractable = null;
    let closestDist = Infinity;

    for (const id of interactables) {
      const interactable = world.getComponent(id, 'Interactable');
      const transform = world.getComponent(id, 'Transform');
      const meshComp = world.getComponent(id, 'MeshComponent');

      // Simple distance filter first
      const distToPlayer = playerTransform.position.distanceTo(transform.position);
      if (distToPlayer > interactable.maxDistance) continue;

      if (meshComp && meshComp.mesh) {
        const intersects = this.raycaster.intersectObject(meshComp.mesh, true);
        if (intersects.length > 0 && intersects[0].distance < closestDist) {
          closestDist = intersects[0].distance;
          closestInteractable = { id, interactable, dist: intersects[0].distance };
        }
      }
    }

    if (closestInteractable) {
      const { id, interactable } = closestInteractable;

      if (interactable.actionType === 'pickup_log') {
        if (inventory.wood < inventory.maxWood) {
          this.hud.setInteractionPrompt('Press [E] or Click to pick up Log');
          if (input.interact) {
            inventory.wood++;
            this.sessionStats.logsCollected++;
            this.worldGenerator.removeLog(id);
            this.audioSystem.playPickup();
            this.hud.showToast(`🪵 Picked up Log (${inventory.wood}/${inventory.maxWood})`);
            this.hud.updateInventory(inventory.wood, inventory.maxWood);
            this.hud.setInteractionPrompt(null);
          }
        } else {
          this.hud.setInteractionPrompt('Inventory Full (5/5 logs)');
          if (input.interact) {
            this.hud.showToast('⚠️ Inventory Full! Add wood to the campfire first.');
          }
        }
      } else if (interactable.actionType === 'fuel_fire') {
        const fire = world.getComponent(id, 'Fire');
        if (inventory.wood > 0) {
          if (fire.fuel < fire.maxFuel) {
            this.hud.setInteractionPrompt('Press [E] or Click to add Fuel (+25s)');
            if (input.interact) {
              inventory.wood--;
              fire.fuel = Math.min(fire.maxFuel, fire.fuel + 25);
              this.sessionStats.logsBurned++;
              this.audioSystem.playAddFuel();
              this.hud.showToast('🔥 Stoked fire! (+25s fuel)');
              this.hud.updateInventory(inventory.wood, inventory.maxWood, inventory.food, inventory.maxFood);
              this.hud.updateFire(fire.fuel, fire.maxFuel);
            }
          } else {
            this.hud.setInteractionPrompt('Fire is blazing at maximum capacity');
          }
        } else {
          this.hud.setInteractionPrompt('Need Wood to feed campfire (Collect logs)');
          if (input.interact) {
            this.hud.showToast('🪵 You have no wood! Find logs in the clearing.');
          }
        }
      } else if (interactable.actionType === 'drink_water') {
        this.hud.setInteractionPrompt('Press [E] or Click to Drink Fresh Water');
        if (input.interact) {
          const thirst = world.getComponent(playerId, 'Thirst');
          if (thirst) {
            thirst.current = Math.min(thirst.max, thirst.current + 45);
          }
          this.audioSystem.playDrink();
          this.hud.showToast('💧 Drank fresh stream water (+45 Thirst)');
        }
      } else if (interactable.actionType === 'harvest_food') {
        if (inventory.food < inventory.maxFood) {
          this.hud.setInteractionPrompt('Press [E] or Click to Forage Berries');
          if (input.interact) {
            inventory.food++;
            this.audioSystem.playPickup();
            this.hud.showToast(`🫐 Foraged wild berries (${inventory.food}/${inventory.maxFood})`);
            this.hud.updateInventory(inventory.wood, inventory.maxWood, inventory.food, inventory.maxFood);

            // Hide berries on bush model and remove interactable
            if (meshComp && meshComp.mesh && meshComp.mesh.userData.berries) {
              meshComp.mesh.userData.berries.forEach((b) => {
                b.visible = false;
              });
            }
            world.removeComponent(id, 'Interactable');
            this.hud.setInteractionPrompt(null);
          }
        } else {
          this.hud.setInteractionPrompt('Food Pouch Full (5/5)');
          if (input.interact) {
            this.hud.showToast('⚠️ Food inventory full! Press [Q] to eat.');
          }
        }
      } else if (interactable.actionType === 'harvest_ration') {
        if (inventory.food < inventory.maxFood) {
          this.hud.setInteractionPrompt('Press [E] or Click to Salvage Ration');
          if (input.interact) {
            inventory.food++;
            this.audioSystem.playPickup();
            this.hud.showToast(`🥫 Salvaged emergency ration (${inventory.food}/${inventory.maxFood})`);
            this.hud.updateInventory(inventory.wood, inventory.maxWood, inventory.food, inventory.maxFood);

            world.removeComponent(id, 'Interactable');
            this.hud.setInteractionPrompt(null);
          }
        } else {
          this.hud.setInteractionPrompt('Food Pouch Full (5/5)');
          if (input.interact) {
            this.hud.showToast('⚠️ Food inventory full! Press [Q] to eat.');
          }
        }
      }
    } else {
      this.hud.setInteractionPrompt(null);
    }

    // 2. Consume Food from Inventory (Key Q or Button)
    if (input.eat) {
      if (inventory.food > 0) {
        inventory.food--;
        const hunger = world.getComponent(playerId, 'Hunger');
        const health = world.getComponent(playerId, 'Health');
        if (hunger) hunger.current = Math.min(hunger.max, hunger.current + 35);
        if (health) health.current = Math.min(health.max, health.current + 15);

        this.audioSystem.playEat();
        this.hud.showToast(`🍖 Ate food (+35 Hunger, +15 Health). Left: ${inventory.food}`);
        this.hud.updateInventory(inventory.wood, inventory.maxWood, inventory.food, inventory.maxFood);
      } else {
        this.hud.showToast('⚠️ No food in inventory! Forage berry bushes or loot ration boxes.');
      }
    }
  }
}
