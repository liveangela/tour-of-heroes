import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { ActionService } from '../actions/action.service';
import { PerkService } from '../perks/perk.service';
import { PlayerService } from '../player/player.service';
import { LiveKlass, KlassService } from './klass.service';
import { StatsService } from '../stats/stats.service';

import { SkillComponent } from '../shared/skill.component';
import { MultiplierPipe } from '../shared/multiplier.pipe';

import { SkillType, NamedUnlock } from '../core/index';
import { GLOBALS } from '../globals';

@Component({
    selector: 'klass-viewer',
    directives: [SkillComponent],
    pipes: [MultiplierPipe],
    styles: [
        `.big-icon {
            width: 216px;
        }
        img.locked {
            -webkit-filter: contrast(0);
        }
        ul {
            list-style: none;
        }
        .reincarnate-button {
            margin-top: 20px;
            margin-bottom: 20px;
        }
        .glyphicon-arrow-right {
            margin-top: 100%;
        }
        `
    ],
    /** Modal code taken from this SO answer: http://stackoverflow.com/a/37402577/262271
    TODO: Definitely consider component-izing at some point. Probably useful elsewhere.
    https://toddmotto.com/transclusion-in-angular-2-with-ng-content
    **/
    template: `
<div *ngIf="reincarnating" class="modal fade show in danger" role="dialog">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <button type="button" class="close"
                    (click)="reincarnating=false">&times;
                </button>
                <h4 class="modal-title">Reincarnate?</h4>
            </div>
            <div class="modal-body">

            <div class="row">
                <div class="col-xs-5">
                    <img class="big-icon"
                        [src]="KS.iconForKlass(PS.player.klass)">
                </div>
                <div class="col-xs-2">
                    <h2><span class="glyphicon glyphicon-arrow-right"></span></h2>
                </div>
                <div class="col-xs-5">
                    <img class="big-icon"
                        [src]="KS.iconForKlass(selected.name)">
                </div>
            </div>

            <dl>
                <dt>Level</dt>
                <dd>{{PS.player.level}}</dd>

                <dt>Previous best</dt>
                <dd>{{Stats.playerLevel(PS.player.klass)}}</dd>

                <template [ngIf]="PS.player.level > Stats.playerLevel(PS.player.klass)">
                <dt>{{PS.player.klass}} ancestry bonus</dt>
                <dd>{{Perks.ancestryBonusForLevel(PS.player.level) | multiplier}}
                (previously:
                    {{Perks.ancestryBonusForLevel(Stats.playerLevel(PS.player.klass)) | multiplier}})
                </dd>
                <dt>Overall ancestry bonus</dt>
                <dd>
                {{Perks.ancestryBonusWithSub(Stats, PS.player.klass, PS.player.level) | multiplier}}
                (previously: {{Perks.ancestryBonus(Stats) | multiplier}})
                </template>
            </dl>

            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-default" (click)="reincarnate()">
                    Reincarnate
                </button>
                <button type="button"
                    class="btn btn-default"
                    (click)="reincarnating=false">Never mind
                </button>
            </div>
        </div>
    </div>
</div>

<div class="row">

<div class="col-xs-4">
<div *ngIf="selected" class="focal">
    <h2>{{displayName(selected)}}</h2>
    <img [src]="'/assets/units/' + selected.img"
        class="big-icon"
        [class.locked]="!selected.unlocked">

    <h3><span class="label label-default">Aptitudes</span></h3>
    <div class="apts">
        <span *ngFor="let apt of selected.aptitudes; let i = index">
        <skill [skill]="i"></skill>{{apt}}
        <br *ngIf="i==3">
        </span>
    </div>

    <div *ngIf="selected.unlocked">
    <h3><span class="label label-default">Perk</span></h3>
    <p><b>{{Perks.perkForKlass(selected.name).sname}}</b>
        {{Perks.perkForKlass(selected.name).sdescription}}
    </p>
    <p><b>Max level reached:</b>{{Stats.playerLevel(selected.name)}}</p>
    </div>

    <button *ngIf="(selected.unlocked && PS.player.level >= reincMinLevel)
                    || cheatMode"
        class="btn btn-default reincarnate-button center-block"
        (click)="reincarnating=true">
            Reincarnate!
    </button>
    <div *ngIf="!selected.unlocked">
        <p *ngIf="selected.progress !== undefined">
            Unlock progress: {{selected.progress | percent:'1.0-0'}}
        </p>
        <p><b>Hint:</b> {{selected.hint}}</p>

    </div>
</div>
</div>

<div class="col-xs-8">
    <div class="row">
        <div *ngFor="let klass of KS.allKlasses"
            class="col-xs-2"
        >
            <img [src]="'/assets/units/' + klass.img"
                [class.locked]="!klass.unlocked">
            <div>
            <a (click)="selected=klass">{{displayName(klass)}}</a>
            </div>
        </div>
    </div>
</div>

</div>
    `
})
export class KlassesComponent {
    reincarnating: boolean = false;
    reincMinLevel = GLOBALS.reincarnationMinLevel;
    selected: LiveKlass;
    ST = SkillType;
    cheatMode = GLOBALS.cheatMode;
    constructor (
        private KS: KlassService,
        private PS: PlayerService,
        private AS: ActionService,
        private Perks: PerkService,
        private Stats: StatsService,
        private router: Router
    ) {
    }

    displayName(klass: LiveKlass) {
        return klass.unlocked ? klass.name : "???";
    }

    reincarnate() {
        /** Reincarnation todo list:
        - stop any currently running actions
        - clear inventory
        - remove all buffs and perks
        - create a new player object and assign the appropriate perks (taken
            care of by player service)
        */
        // TODO: Should also reset the focal zone (incl. clearing currentAction/lastOutcome)
        this.AS.stopAllActions();

        /** TODO: This is kind of lame. Should try to find a more appropriate
        place for this logic at some point. **/
        if (
            (!this.Stats.unlocked(NamedUnlock.Pacifist)) &&
            (this.PS.player.level >= 10) &&
            (this.PS.player.skills[SkillType.Combat].baseLevel < 1)
        ) {
            this.Stats.unlock(NamedUnlock.Pacifist);
        }
        this.Stats.setLevel(this.PS.player.level, this.PS.player.klass);

        this.Perks.resetAllPerks();
        this.PS.reincarnate(this.selected.name);
        this.router.navigate(['/']);
    }
}
