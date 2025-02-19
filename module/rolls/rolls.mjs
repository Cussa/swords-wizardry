import { SwordsWizardryChatMessage } from '../helpers/overrides.mjs';
export class AttackRoll extends Roll {

  constructor(formula, rollData={}, options={}) {
    super(formula, rollData, options);
    this.hitTargets = [];
    this.missedTargets = [];
  }

  async evaluate() {
    const result = await super.evaluate();
    const toHitMatrix = this.data.actor.toHitAC;
    // TODO move game.user.targets to up the chain and pass it in for more generic attacks?
    game.user.targets.forEach((target) => {
      const targetAC = target.actor.system.ac.value;
      const acKey = targetAC < 0
        ? `${targetAC}`
        : `+${targetAC}`; // AC >= 0 is stored as '+#' in system.toHitAC
      if (result.total >= toHitMatrix[acKey]) {
        this.hitTargets.push(target);
      } else {
        this.missedTargets.push(target);
      }
    });
    return result;
  }

  async render(options) {
    const speaker = ChatMessage.getSpeaker({ actor: this.data.actor });
    const rollMode = game.settings.get('core', 'rollMode');
    if (!this._evaluated) await this.evaluate();
    const rollHtml = await super.render()
    const template = 'systems/swords-wizardry/templates/rolls/attack-roll-sheet.hbs';
    const chatData = {
      item: this.data.item,
      actor: this.data.actor,
      roll: rollHtml,
      total: this.total,
      hitTargets: this.hitTargets,
      missedTargets: this.missedTargets,
      damageFormula: this.data.damageFormula
    }
    const resultsHtml = await renderTemplate(template, chatData);
    const msg = await SwordsWizardryChatMessage.create({
      rolls: [this],
      rollMode: rollMode,
      user: game.user._id,
      speaker: speaker,
      content: resultsHtml
    });
  }
}

export class DamageRoll extends Roll {
  async evaluate() {
    const result = await super.evaluate();
    game.user.targets.forEach((target) => {
        target.actor.system.hp.value -= result.total;
    });
    return result;
  }

  async render(options) {
    const speaker = ChatMessage.getSpeaker({ actor: this.data.actor });
    const rollMode = game.settings.get('core', 'rollMode');
    if (!this._evaluated) await this.evaluate();
    const rollHtml = await super.render()
    const template = 'systems/swords-wizardry/templates/rolls/damage-roll-sheet.hbs';
    const chatData = {
      item: this.data.item,
      actor: this.data.actor,
      roll: rollHtml,
      total: this.total,
    }
    const resultsHtml = await renderTemplate(template, chatData);
    const msg = await SwordsWizardryChatMessage.create({
      rollMode: rollMode,
      user: game.user._id,
      speaker: speaker,
      content: resultsHtml
    });
  }
}
