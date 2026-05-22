import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, signal, HostListener } from '@angular/core';

interface Point { x: number; y: number; }
interface Entity extends Point { vx: number; vy: number; radius: number; color: string; hp?: number; maxHp?: number; type?: string; damage?: number; state?: string; homing?: boolean; life?: number; maxLife?: number; }
interface Particle extends Point { vx: number; vy: number; life: number; maxLife: number; color: string; size: number; alpha: number; }
interface PowerUp extends Point { vy: number; radius: number; color: string; type: 'weapon' | 'bomb' | 'shield' | 'pierce' | 'freeze' | 'orbit' | 'laser' | 'health'; pulse: number; }
interface Star extends Point { size: number; speed: number; alpha: number; type: 'background' | 'foreground' }
interface FloatingText extends Point { text: string; color: string; life: number; maxLife: number; vy: number; }

interface ActiveWingman {
    x: number; y: number; vx: number; vy: number;
    bp: {x: number, y: number, partId: string}[];
    hp: number; maxHp: number;
    weapons: any[]; speed: number;
    lastShotTime: number; angleOffset: number;
    orbitRadius: number;
}

@Component({
  selector: 'app-root',
  template: `
    <div class="relative w-full h-screen bg-slate-950 overflow-hidden cursor-crosshair">
      <canvas #gameCanvas class="block touch-none"
              (mousemove)="onMouseMove($event)"
              (mousedown)="onMouseDown()"
              (mouseup)="mouseDown = false"
              (mouseleave)="mouseDown = false"
              (touchstart)="onTouchStart($event)"
              (touchmove)="onTouch($event)"
              (touchend)="onTouchEnd($event)"
              (touchcancel)="onTouchEnd($event)">
      </canvas>

      @if (!gameStarted()) {
        <div class="absolute inset-0 z-50 overflow-y-auto custom-scrollbar">
          <div class="min-h-full flex flex-col items-center justify-center py-10 relative">
            <div class="fixed inset-0 bg-slate-950/60 backdrop-blur-sm block pointer-events-none"></div>
            <div class="relative z-10 flex flex-col items-center w-full max-w-6xl px-2 sm:px-4">
              <h1 class="text-3xl sm:text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-cyan-400 tracking-widest filter drop-shadow-[0_0_30px_rgba(34,211,238,0.5)] font-mono">机库</h1>
              <div class="text-xl sm:text-2xl text-yellow-400 font-mono mb-4 sm:mb-8 font-bold flex items-center gap-2 drop-shadow-md">
                 <span class="material-icons">toll</span> {{ coins() }} 信用点
              </div>
              
              <div class="flex flex-col lg:flex-row gap-4 sm:gap-8 w-full justify-center mb-4 sm:mb-8 lg:h-[60vh] min-h-0 sm:min-h-[500px]">
                <!-- LEFT: GRID BUILDER -->
                <div class="flex-1 w-full border border-white/20 rounded-2xl bg-slate-900/40 p-2 sm:p-4 shrink-0 lg:shrink flex flex-col items-center justify-center relative backdrop-blur-md overflow-hidden min-h-[250px] sm:min-h-[350px]">
                   <h2 class="absolute top-2 sm:top-4 left-2 sm:left-4 text-lg sm:text-xl font-mono text-cyan-400 font-bold tracking-widest hidden md:block">组装网格</h2>
                 
                 <div class="absolute top-4 right-4 flex justify-end gap-2 px-4 pointer-events-none z-10 hidden sm:flex">
                    <div class="flex items-center gap-1 text-slate-300 font-mono text-xs bg-black/50 px-2 py-1 rounded-full border border-white/10">
                       <span class="material-icons text-[14px] text-yellow-400">fitness_center</span> 质量: {{ getShipStats().mass }}
                    </div>
                    <div class="flex items-center gap-1 text-slate-300 font-mono text-xs bg-black/50 px-2 py-1 rounded-full border border-white/10">
                       <span class="material-icons text-[14px] text-emerald-400">favorite</span> 耐久: {{ getShipStats().hp }}
                    </div>
                    <div class="flex items-center gap-1 text-slate-300 font-mono text-xs bg-black/50 px-2 py-1 rounded-full border border-white/10">
                       <span class="material-icons text-[14px] text-amber-400">speed</span> 速度: {{ getShipStats().speed.toFixed(1) }}
                    </div>
                    <div class="flex items-center gap-1 text-slate-300 font-mono text-xs bg-black/50 px-2 py-1 rounded-full border border-white/10">
                       <span class="material-icons text-[14px] text-red-400">bolt</span> 武器: {{ getShipStats().weapons.length }}
                    </div>
                 </div>
                 
                 <div class="text-xs text-slate-400 mb-2 font-mono mt-8 sm:mt-0 text-center z-10 transition-colors">将零件拖拽到此处。点击已放置的零件出售。<br>至少需要一个引擎才能发射。</div>
                 
                 <div class="grid gap-[1px] bg-cyan-900/40 p-[1px] rounded-lg shadow-inner z-10 border border-cyan-800/50" style="grid-template-columns: repeat(11, minmax(0, 1fr));">
                    @for (row of gridRows; track row) {
                       @for (col of gridCols; track col) {
                          <div class="w-6 h-6 sm:w-10 sm:h-10 bg-slate-800/80 hover:bg-slate-700 cursor-pointer relative transition-colors flex justify-center items-center"
                               [class.bg-white/20]="isGridHover(col, row)"
                               (dragover)="onGridDragOver($event, col, row)"
                               (dragleave)="onGridDragLeave($event)"
                               (drop)="onGridDrop($event, col, row)"
                               (click)="onGridClick(col, row)">
                             @if (getPartAt(col, row); as p) {
                                <div class="absolute inset-0 m-[1px] flex items-center justify-center pointer-events-none z-10"> 
                                     <svg class="w-full h-full overflow-visible drop-shadow-sm" viewBox="0 0 10 10">
                                        @if (getPartAt(col, row - 1)) {
                                            <!-- Up connection -->
                                            <rect x="3.5" y="-3" width="3" height="4" fill="#334155" />
                                            <rect x="4.5" y="-1.5" width="1" height="2" fill="#94a3b8" />
                                        }
                                        @if (getPartAt(col - 1, row)) {
                                            <!-- Left connection -->
                                            <rect x="-3" y="3.5" width="4" height="3" fill="#334155" />
                                            <rect x="-1.5" y="4.5" width="2" height="1" fill="#94a3b8" />
                                        }
                                        @if (getPartDef(p.partId)?.type === 'core' || getPartDef(p.partId)?.type === 'wingman_core') {
                                           <circle cx="5" cy="5" r="4.5" [attr.fill]="getPartDef(p.partId)?.color" />
                                           <circle cx="5" cy="5" r="3" fill="#ffffff" />
                                           <circle cx="5" cy="5" r="1.5" fill="#93c5fd" />
                                        }
                                        @if (getPartDef(p.partId)?.type === 'hull') {
                                            <rect x="1" y="1" width="8" height="8" [attr.fill]="getPartDef(p.partId)?.color" stroke="rgba(255,255,255,0.2)" stroke-width="0.5"/>
                                        }
                                        @if (getPartDef(p.partId)?.type === 'engine') {
                                            <rect x="1" y="1" width="8" height="8" [attr.fill]="getPartDef(p.partId)?.color" />
                                            <rect x="3" y="8" width="4" height="2" fill="#475569" />
                                        }
                                        @if (getPartDef(p.partId)?.type === 'weapon') {
                                            <rect x="2" y="2" width="6" height="6" [attr.fill]="getPartDef(p.partId)?.color" />
                                            <rect x="4" y="-1" width="2" height="6" fill="#ffffff" />
                                        }
                                     </svg>
                                </div>
                             } @else if (col === 0 && row === 0) {
                                 <span class="material-icons text-white/10 text-xs pointer-events-none">star</span>
                             }
                          </div>
                       }
                    }
                 </div>
              </div>

              <!-- RIGHT: INVENTORY -->
              <div class="flex-1 w-full flex flex-col gap-2 sm:gap-4 border border-white/20 rounded-2xl bg-slate-900/40 p-2 sm:p-4 h-[250px] sm:h-[300px] shrink-0 lg:shrink lg:h-full overflow-hidden backdrop-blur-md">
                 <h2 class="text-lg sm:text-xl font-mono text-cyan-400 font-bold tracking-widest text-center sticky top-0 bg-slate-900/80 z-10 py-1 sm:py-2 border-b border-white/10 mb-1 sm:mb-2">组件</h2>
                 <div class="overflow-y-auto custom-scrollbar flex flex-col gap-2 sm:gap-3 pr-1 sm:pr-2 pb-4">
                    @for (part of partCatalog; track part.id) {
                       @if (part.type !== 'core') {
                           <div draggable="true"
                                (dragstart)="onCatalogDragStart($event, part)"
                                (click)="selectMobilePart(part)"
                                [class.ring-2]="selectedMobilePart?.id === part.id"
                                [class.ring-cyan-400]="selectedMobilePart?.id === part.id"
                                class="p-2 sm:p-3 border border-white/10 bg-slate-800/60 rounded-xl cursor-pointer hover:border-cyan-400 hover:bg-slate-800 transition-all flex flex-col gap-1 sm:gap-2">
                               <div class="flex justify-between items-center text-white">
                                  <div class="flex items-center gap-2 sm:gap-3">
                                     <div class="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center relative">
                                        <svg class="w-full h-full overflow-visible drop-shadow-md" viewBox="0 0 10 10">
                                            @if (part.type === 'core' || part.type === 'wingman_core') {
                                               <circle cx="5" cy="5" r="4.5" [attr.fill]="part.color" />
                                               <circle cx="5" cy="5" r="3" fill="#ffffff" />
                                               <circle cx="5" cy="5" r="1.5" fill="#93c5fd" />
                                            }
                                            @if (part.type === 'hull') {
                                                <rect x="1" y="1" width="8" height="8" [attr.fill]="part.color" stroke="rgba(255,255,255,0.2)" stroke-width="0.5"/>
                                            }
                                            @if (part.type === 'engine') {
                                                <rect x="1" y="1" width="8" height="8" [attr.fill]="part.color" />
                                                <rect x="3" y="8" width="4" height="2" fill="#475569" />
                                            }
                                            @if (part.type === 'weapon') {
                                                <rect x="2" y="2" width="6" height="6" [attr.fill]="part.color" />
                                                <rect x="4" y="-1" width="2" height="6" fill="#ffffff" />
                                            }
                                        </svg>
                                     </div>
                                     <span class="font-mono font-bold">{{ part.name }}</span>
                                  </div>
                                  <span class="text-yellow-400 font-bold font-mono text-sm">{{ part.cost }}¢</span>
                               </div>
                               <div class="flex gap-2 sm:gap-4 text-[10px] sm:text-xs font-mono text-slate-400 mt-1 pl-6 sm:pl-9 overflow-hidden flex-wrap max-h-12 sm:max-h-8 text-ellipsis whitespace-nowrap leading-tight">
                                  <span title="质量（越高船体越慢，影响速度）"><span class="material-icons text-[12px] sm:text-[14px] text-slate-500 align-text-bottom">fitness_center</span> {{ part.mass }}</span>
                                  <span title="耐久"><span class="material-icons text-[12px] sm:text-[14px] text-emerald-500 align-text-bottom">favorite</span> {{ part.hp }}</span>
                                  @if (part.type === 'engine') {
                                     <span title="推力"><span class="material-icons text-[12px] sm:text-[14px] text-amber-500 align-text-bottom">speed</span> {{ part.thrust }}</span>
                                  }
                                  @if (part.type === 'weapon') {
                                     <span title="伤害"><span class="material-icons text-[12px] sm:text-[14px] text-red-500 align-text-bottom">bolt</span> {{ part.damage }}</span>
                                     <span title="射速"><span class="material-icons text-[12px] sm:text-[14px] text-orange-500 align-text-bottom">sync</span> {{ part.fireRate }}</span>
                                  }
                               </div>
                           </div>
                       }
                    }
                 </div>
              </div>
            </div>

            <button (click)="startGame()" class="relative group px-10 py-3 md:px-16 md:py-4 border-2 border-cyan-400 text-cyan-400 hover:text-white rounded-full font-black text-xl md:text-2xl transition-all hover:scale-105 active:scale-95 cursor-pointer tracking-widest font-mono overflow-hidden shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:shadow-[0_0_40px_rgba(34,211,238,0.6)] shrink-0" [class.opacity-50]="!canLaunch()">
              <div class="absolute inset-0 bg-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <span class="relative z-10 filter drop-shadow-md flex items-center gap-2"><span class="material-icons text-3xl">rocket_launch</span> 发射</span>
            </button>
          </div>
        </div>
      </div>
      }

      @if (showUpgradeUI()) {
        <div class="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md z-50 transition-all origin-center animate-in fade-in zoom-in duration-500 overflow-y-auto custom-scrollbar py-10">
          <h2 class="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 tracking-widest mb-8 filter drop-shadow-[0_0_20px_rgba(52,211,153,0.5)] font-mono mt-auto">选择升级</h2>
          
          <div class="flex flex-col md:flex-row gap-6 p-4 mb-auto">
            @for (option of upgradeOptions; track option.type) {
                <button (click)="selectUpgrade(option.type)"
                        class="bg-slate-900/60 border border-emerald-500/30 rounded-2xl p-4 sm:p-6 w-full sm:w-64 flex flex-col items-center text-center transition-all hover:scale-105 hover:bg-slate-800 hover:border-emerald-400 hover:shadow-[0_0_30px_rgba(52,211,153,0.3)] group focus:outline-none shrink-0">
                    <div class="w-16 h-16 rounded-full bg-emerald-950/50 border border-emerald-500/50 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(52,211,153,0.6)] transition-all">
                        <span class="material-icons text-3xl text-emerald-400">{{ option.icon }}</span>
                    </div>
                    <h3 class="text-xl font-bold text-white mb-2 font-mono">{{ option.name }}</h3>
                    <p class="text-sm text-emerald-200/70">{{ option.desc }}</p>
                </button>
            }
          </div>
        </div>
      }

      @if (gameOver()) {
        <div class="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md z-50 transition-all origin-center animate-in fade-in zoom-in duration-500 overflow-y-auto pt-10">
          <h1 class="text-5xl sm:text-7xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-red-400 to-orange-600 tracking-widest mb-6 filter drop-shadow-[0_0_40px_rgba(239,68,68,0.5)] font-mono mt-auto">战机摧毁</h1>
          <div class="flex flex-col items-center bg-black/40 border border-white/10 rounded-2xl p-8 mb-10 w-80 backdrop-blur-xl shrink-0">
             <span class="text-sm text-slate-400 font-mono tracking-widest mb-2">最终得分</span>
             <span class="text-5xl text-white font-black font-mono mb-6">{{ score() }}</span>
             <span class="text-sm text-yellow-400/80 font-mono tracking-widest mb-1">获得信用点</span>
             <span class="text-3xl text-yellow-400 font-black font-mono">+{{ recentTokensEarned }}</span>
          </div>
          <button (click)="returnToHangar()" class="px-10 py-5 bg-white text-black rounded-xl font-bold text-xl transition-all hover:scale-105 active:scale-95 hover:bg-slate-200 cursor-pointer font-mono tracking-widest uppercase mb-auto shrink-0">
            返回机库
          </button>
        </div>
      }

      <div class="absolute top-4 left-4 right-4 sm:top-6 sm:left-6 sm:right-6 flex items-start justify-between pointer-events-none select-none z-40">
         <div class="flex flex-col gap-3">
             <div class="flex flex-col sm:flex-row gap-3">
                 <div class="px-4 py-2 sm:px-8 sm:py-3 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-full text-white font-mono text-xl sm:text-2xl font-black tracking-widest flex items-center gap-4 filter drop-shadow-lg overflow-hidden relative">
                    <div class="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent"></div>
                    <span class="text-slate-400 text-sm">得分</span> 
                    <span class="bg-gradient-to-br from-emerald-300 to-cyan-400 bg-clip-text text-transparent filter drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]">{{ score() }}</span>
                 </div>
                 
                 @if (gameStarted()) {
                   <div class="px-4 py-2 sm:px-6 sm:py-2 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-full text-white flex flex-col justify-center filter drop-shadow-lg w-40 sm:w-48 relative">
                      <div class="flex items-center justify-between gap-2 mb-1">
                         <span class="text-slate-400 text-xs sm:text-sm font-mono">耐久</span>
                         <span class="text-emerald-400 font-bold font-mono text-xs sm:text-sm">{{ health() }} / {{ getShipStats().hp }}</span>
                      </div>
                      <div class="w-full h-2 bg-slate-950/80 border border-emerald-900/50 rounded-full overflow-hidden relative">
                          <div class="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-300"
                               [style.width.%]="(health() / getShipStats().hp) * 100"></div>
                      </div>
                   </div>
                 }
             </div>
             
             @if (gameStarted()) {
               <div class="flex flex-wrap items-center gap-2 sm:gap-4 px-2 sm:px-4 mt-2 font-mono text-xs sm:text-sm">
                   @if (weaponLevel > 1) {
                      <div class="flex items-center gap-1 sm:gap-2 text-cyan-400 font-bold bg-cyan-950/50 px-2 sm:px-3 py-1 rounded-full border border-cyan-800/50">
                         <span class="material-icons text-xs sm:text-sm">bolt</span> 武器等级 {{ weaponLevel }}
                      </div>
                   }
                   @if (hasShield) {
                      <div class="flex items-center gap-1 sm:gap-2 text-purple-400 font-bold bg-purple-950/50 px-2 sm:px-3 py-1 rounded-full border border-purple-800/50">
                         <span class="material-icons text-xs sm:text-sm">security</span> 护盾运行中
                      </div>
                   }
                   @if (hasPierce) {
                      <div class="flex items-center gap-1 sm:gap-2 text-yellow-400 font-bold bg-yellow-950/50 px-2 sm:px-3 py-1 rounded-full border border-yellow-800/50">
                         <span class="material-icons text-xs sm:text-sm">double_arrow</span> 穿甲弹
                      </div>
                   }
               </div>
             }
         </div>
         
         @if (gameStarted()) {
             <div class="flex flex-col items-end gap-2 pointer-events-auto">
                 <div class="px-6 py-2 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-full text-white font-mono text-xl tracking-widest relative overflow-hidden">
                     <span class="text-slate-400 text-sm mr-2">波次</span>
                     <span class="text-white font-bold">{{ wave() }}</span>
                 </div>
                 
                 <button (click)="triggerEMP()" 
                         class="mt-2 relative overflow-hidden rounded-full font-mono font-bold tracking-widest transition-all focus:outline-none"
                         [class.opacity-50]="empCooldown() > 0"
                         [class.cursor-not-allowed]="empCooldown() > 0"
                         [class.hover:scale-105]="empCooldown() <= 0"
                         [class.active:scale-95]="empCooldown() <= 0">
                    <div class="absolute inset-0 bg-cyan-900/40 backdrop-blur-md border border-cyan-400/30 rounded-full"></div>
                    @if (empCooldown() > 0) {
                        <div class="absolute bottom-0 left-0 h-full bg-cyan-600/30" [style.width.%]="(empCooldown() / 15000) * 100"></div>
                    } @else {
                        <div class="absolute inset-0 bg-gradient-to-r from-cyan-600 to-blue-600 animate-pulse"></div>
                    }
                    <div class="relative z-10 px-6 py-3 flex items-center gap-2">
                        <span class="material-icons text-cyan-100" [class.animate-spin]="empCooldown() <= 0">radar</span>
                        <span class="text-cyan-100 uppercase" [class.text-white]="empCooldown() <= 0">EMP爆破</span>
                        @if (empCooldown() <= 0) {
                            <span class="text-xs ml-1 text-cyan-200 hidden md:inline">(空格)</span>
                        }
                    </div>
                 </button>
             </div>
         }
      </div>
      
      <!-- GRAZE BAR -->
      @if (gameStarted()) {
        <div class="fixed bottom-6 left-1/2 transform -translate-x-1/2 flex flex-col items-center pointer-events-none z-40 w-72">
           <div class="text-xs font-mono font-bold tracking-widest text-fuchsia-300 mb-2 drop-shadow-[0_0_8px_rgba(217,70,239,0.8)]" [class.animate-pulse]="grazeEnergy() >= 100">
               {{ grazeEnergy() >= 100 ? 'SINGULARITY READY [SHIFT]' : 'GRAZE ENERGY' }}
           </div>
           <div class="w-full h-3 bg-slate-950/80 border-2 border-fuchsia-900/50 rounded-full overflow-hidden relative shadow-[0_0_15px_rgba(217,70,239,0.3)]">
              <div class="absolute top-0 left-0 h-full bg-gradient-to-r from-fuchsia-700 via-purple-500 to-fuchsia-400 transition-all duration-200"
                   [style.width.%]="grazeEnergy()"
                   [class.animate-pulse]="grazeEnergy() >= 100"></div>
           </div>
        </div>
      }

      <!-- BOSS HP BAR -->
      @if (gameStarted() && bossSpawned && bossHpPercent() > 0) {
          <div class="fixed top-24 left-1/2 transform -translate-x-1/2 w-96 flex flex-col items-center pointer-events-none z-40 transition-all duration-300">
             <div class="text-sm font-mono font-bold tracking-widest text-red-500 mb-2 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]">
                 APEX ENTITY
             </div>
             <div class="w-full h-4 bg-slate-950/80 border-2 border-red-900/50 rounded-full overflow-hidden relative shadow-[0_0_15px_rgba(239,68,68,0.4)]">
                 <div class="absolute top-0 left-0 h-full bg-gradient-to-r from-red-700 via-orange-500 to-red-500 transition-all duration-75"
                      [style.width.%]="bossHpPercent()"></div>
             </div>
          </div>
      }
      
      @if (gameStarted() && !mouseDown && !gameOver() && score() === 0) {
        <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 flex flex-col items-center pointer-events-none select-none text-white/70 font-sans tracking-wide animate-pulse w-full text-center">
          <span class="material-icons text-4xl mb-2">touch_app</span>
          <span>长按自动开火。准确在节拍上点击可释放完美攻击！</span>
        </div>
      }
    </div>
  `
})
export class App implements AfterViewInit, OnDestroy {
  @ViewChild('gameCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  ctx!: CanvasRenderingContext2D;

  width = 0;
  height = 0;
  animationId = 0;

  gameOver = signal(false);
  gameStarted = signal(false);
  startFlashTimer = 0;
  score = signal(0);
  health = signal(3);
  wave = signal(1);
  showUpgradeUI = signal(false);
  upgradeOptions: any[] = [];
  bossSpawned = false;
  empCooldown = signal(0);
  grazeEnergy = signal(0);
  singularityActive = false;
  singularityTimer = 0;
  invulnerableTimer = 0;
  
  audioCtx: AudioContext | null = null;
  masterGain: GainNode | null = null;
  noiseBuffer: AudioBuffer | null = null;
  bpm = 130;
  beatInterval = 60000 / 130;
  tickInterval = (60000 / 130) / 4;
  lastTickIndex = -1;
  beatPulse = signal(0);
  measure = 0;
  currentChord = 0;
  
  // C Minor Pentatonic + some extra colors
  scale = [261.63, 311.13, 349.23, 392.00, 466.16, 523.25, 622.25, 698.46];

  waveTimer = 0;
  enemiesToSpawn = 10;
  enemiesSpawned = 0;
  
  coins = signal(0);
  
  partCatalog = [
    { id: 'core', type: 'core', name: '指挥核心', cost: 0, hp: 1, mass: 2, color: '#3b82f6' },
    { id: 'wingman_core', type: 'wingman_core', name: '僚机核心', cost: 100, hp: 1, mass: 1, color: '#3b82f6' },
    { id: 'hull_light', type: 'hull', name: '轻型框架', cost: 10, hp: 1, mass: 1, color: '#94a3b8' },
    { id: 'hull_heavy', type: 'hull', name: '重型装甲', cost: 40, hp: 2, mass: 3, color: '#475569' },
    { id: 'hull_stealth', type: 'hull', name: '隐形护甲', cost: 120, hp: 1, mass: 1, color: '#1e293b' },
    { id: 'hull_gem', type: 'hull', name: '结晶偏导器', cost: 200, hp: 3, mass: 2, color: '#c026d3' },
    { id: 'hull_fracture', type: 'hull', name: '时空断裂板', cost: 800, hp: 5, mass: 4, color: '#14b8a6' },
    { id: 'hull_neutron', type: 'hull', name: '中子聚合装甲', cost: 1500, hp: 8, mass: 5, color: '#f87171' },
    { id: 'engine_basic', type: 'engine', name: '基础推进器', cost: 50, hp: 1, mass: 1, thrust: 15, color: '#f59e0b' },
    { id: 'engine_plasma', type: 'engine', name: '等离子引擎', cost: 150, hp: 1, mass: 2, thrust: 40, color: '#0ea5e9' },
    { id: 'engine_antimatter', type: 'engine', name: '反物质引擎', cost: 500, hp: 2, mass: 3, thrust: 100, color: '#8b5cf6' },
    { id: 'engine_stardust', type: 'engine', name: '星尘聚变引擎', cost: 1200, hp: 3, mass: 4, thrust: 250, color: '#f472b6' },
    { id: 'engine_void', type: 'engine', name: '虚空跃迁引擎', cost: 2500, hp: 4, mass: 5, thrust: 500, color: '#a855f7' },
    { id: 'weapon_blaster', type: 'weapon', name: '自动冲击波', cost: 80, hp: 1, mass: 1, damage: 0.5, fireRate: 2, color: '#ef4444' },
    { id: 'weapon_cannon', type: 'weapon', name: '重型加农炮', cost: 250, hp: 1, mass: 3, damage: 1.5, fireRate: 0.5, color: '#b91c1c' },
    { id: 'weapon_spread', type: 'weapon', name: '散射火炮', cost: 300, hp: 1, mass: 2, damage: 0.3, fireRate: 1, color: '#d946ef' },
    { id: 'weapon_laser', type: 'weapon', name: '高频激光', cost: 400, hp: 1, mass: 2, damage: 0.8, fireRate: 4, color: '#10b981' },
    { id: 'weapon_missile', type: 'weapon', name: '破坏者飞弹', cost: 600, hp: 2, mass: 4, damage: 3.0, fireRate: 0.3, color: '#f59e0b' },
    { id: 'weapon_railgun', type: 'weapon', name: '超电磁炮', cost: 1000, hp: 2, mass: 5, damage: 5.0, fireRate: 0.2, color: '#38bdf8' },
    { id: 'weapon_blackhole', type: 'weapon', name: '奇点发生器', cost: 2000, hp: 3, mass: 6, damage: 10.0, fireRate: 0.1, color: '#000000' }
  ];

  blueprint = signal<{x: number, y: number, partId: string}[]>([
      {x: 0, y: 0, partId: 'core'}
  ]);

  playerBp: {x: number, y: number, partId: string}[] = [];
  activeWingmen: ActiveWingman[] = [];

  gridRows = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];
  gridCols = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];

  getPartDef(id: string) { return this.partCatalog.find(p => p.id === id); }
  getPartAt(x: number, y: number) { return this.blueprint().find(p => p.x === x && p.y === y); }

  getShipStats(bpArray: any[] = this.blueprint()) {
      let mass = 0;
      let thrust = 0;
      let hp = 0;
      const weapons: any[] = [];
      for(const bp of bpArray) {
          const def = this.getPartDef(bp.partId);
          if(!def) continue;
          mass += def.mass;
          hp += def.hp;
          if(def.thrust) thrust += def.thrust;
          if(def.type === 'weapon') weapons.push({x: bp.x, y: bp.y, def});
      }
      return {
          mass,
          thrust,
          hp,
          weapons,
          speed: Math.max(0, thrust / (mass || 1))
      };
  }

  saveGameData() {
    localStorage.setItem('starblaster_coins', this.coins().toString());
    localStorage.setItem('starblaster_blueprint', JSON.stringify(this.blueprint()));
  }

  canLaunch() {
      const stats = this.getShipStats();
      return stats.thrust > 0;
  }

   dragHoverCell: {x: number, y: number} | null = null;
   draggedPart: any = null;
   selectedMobilePart: any = null;
   
   selectMobilePart(part: any) {
      if (this.selectedMobilePart?.id === part.id) {
          this.selectedMobilePart = null;
      } else {
          this.selectedMobilePart = part;
      }
   }
   
   onCatalogDragStart(e: DragEvent, part: any) {
      this.draggedPart = part;
      if (e.dataTransfer) {
          e.dataTransfer.setData('text/plain', part.id);
          e.dataTransfer.effectAllowed = 'copy';
      }
  }
  
  isGridHover(x: number, y: number) {
      return this.dragHoverCell?.x === x && this.dragHoverCell?.y === y;
  }
  
  onGridDragOver(e: DragEvent, x: number, y: number) {
      e.preventDefault();
      this.dragHoverCell = {x, y};
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  }
  
  onGridDragLeave(e: DragEvent) {
      this.dragHoverCell = null;
  }
  
  onGridDrop(e: DragEvent, x: number, y: number) {
      e.preventDefault();
      this.dragHoverCell = null;
      if (this.draggedPart) {
          this.placePart(x, y, this.draggedPart);
      }
      this.draggedPart = null;
  }
  
  placePart(x: number, y: number, part: any) {
     if (x === 0 && y === 0) return; // Core is immortal
     
     // Continuity check (KSP style)
     const isConnected = this.blueprint().some(p => Math.abs(p.x - x) + Math.abs(p.y - y) === 1);
     if (this.blueprint().length > 0 && !isConnected && part.type !== 'wingman_core') {
         return; // Must connect to existing block
     }

     const existing = this.getPartAt(x, y);
     let newCoins = this.coins();
     
     if (existing) {
         if (existing.partId === part.id) return;
         const existingDef = this.getPartDef(existing.partId);
         if (existingDef) newCoins += existingDef.cost; // Refund
     }
     
     if (newCoins >= part.cost) {
         newCoins -= part.cost;
         this.coins.set(newCoins);
         
         const newBp = this.blueprint().filter(p => p.x !== x || p.y !== y);
         newBp.push({x, y, partId: part.id});
         this.blueprint.set(newBp);
         this.saveGameData();
     }
  }
  
  onGridClick(x: number, y: number) {
      if (this.selectedMobilePart) {
          this.placePart(x, y, this.selectedMobilePart);
          return;
      }
      if (x === 0 && y === 0) return; // Core removal blocked
      const existing = this.getPartAt(x, y);
      if (existing) {
          const existingDef = this.getPartDef(existing.partId);
          if (existingDef) {
             this.coins.update(c => c + existingDef.cost);
             this.blueprint.update(bp => bp.filter(p => !(p.x === x && p.y === y)));
             this.saveGameData();
          }
      }
  }

  player: Point = { x: -1000, y: -1000 };
  mouseDown = false;
  lastShotTime = 0;

  bullets: Entity[] = [];
  enemyBullets: Entity[] = [];
  enemies: Entity[] = [];
  particles: Particle[] = [];
  powerUps: PowerUp[] = [];
  stars: Star[] = [];
  floatingTexts: FloatingText[] = [];

  weaponLevel = 1;
  hasShield = false;
  hasPierce = false;
  freezeTimer = 0;
  orbitTimer = 0;
  laserTimer = 0;
  orbitAngle = 0;
  shakeIntensity = 0;

  lastFrameTime = 0;
  spawnTimer = 0;
  spawnRate = 1200;

  ngAfterViewInit() {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    this.resize();
    this.initStars();
    this.player = { x: this.width / 2, y: this.height - 100 };
    
    try {
        const savedCoins = localStorage.getItem('starblaster_coins');
        if (savedCoins !== null) {
            let coins = parseInt(savedCoins, 10);
            // Safety net: if player has less than 20 coins, boost to 50
            if (coins < 20) coins = 50;
            this.coins.set(coins);
        } else {
            // First time bonus: 1000 coins
            this.coins.set(1000);
            localStorage.setItem('starblaster_coins', '1000');
        }
        
        const savedBp = localStorage.getItem('starblaster_blueprint');
        if (savedBp) this.blueprint.set(JSON.parse(savedBp));
    } catch(e) { console.error('Failed to load saved data', e); }

    this.loop(performance.now());
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.animationId);
  }

  @HostListener('window:resize')
  resize() {
    if (!this.canvasRef) return;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvasRef.nativeElement.width = this.width;
    this.canvasRef.nativeElement.height = this.height;
  }

  onMouseMove(e: MouseEvent) {
    this.player.x = e.clientX;
    this.player.y = e.clientY;
  }

  onMouseDown() {
    this.mouseDown = true;
  }

  onTouchStart(e: TouchEvent) {
    if (e.cancelable) e.preventDefault();
    if (e.touches.length > 0) {
      this.mouseDown = true;
      this.player.x = e.touches[0].clientX;
      this.player.y = e.touches[0].clientY - 40;
    }
  }

  onTouch(e: TouchEvent) {
    if (e.cancelable) e.preventDefault();
    if (e.touches.length > 0) {
      this.mouseDown = true;
      this.player.x = e.touches[0].clientX;
      this.player.y = e.touches[0].clientY - 40; // Offset touch slightly above finger
    }
  }

  onTouchEnd(e: TouchEvent) {
    if (e.cancelable) e.preventDefault();
    this.mouseDown = false;
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent) {
    if (e.code === 'Space') {
      this.triggerEMP();
    }
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      this.triggerSingularity();
    }
  }

  triggerSingularity() {
    if (this.gameStarted() && !this.gameOver() && this.grazeEnergy() >= 100 && !this.singularityActive) {
        this.grazeEnergy.set(0);
        this.singularityActive = true;
        this.singularityTimer = 4000;
        this.screenShake(30);
        this.floatingTexts.push({x: this.player.x, y: this.player.y - 50, vy: -2, text: '奇点已启动', color: '#d946ef', life: 2000, maxLife: 2000});
    }
  }

  triggerEMP() {
    if (this.empCooldown() <= 0 && this.gameStarted() && !this.gameOver()) {
       this.empCooldown.set(15000);
       this.enemyBullets = [];
       this.freezeTimer = 3000;
       this.createExplosion(this.player.x, this.player.y, 80, '#06b6d4');
       this.screenShake(30);
       this.floatingTexts.push({x: this.player.x, y: this.player.y - 40, vy: -2, text: 'EMP 爆破', color: '#06b6d4', life: 1500, maxLife: 1500});
    }
  }

  createNoiseBuffer() {
      if (!this.audioCtx) return null;
      const bufferSize = this.audioCtx.sampleRate * 0.5;
      const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
      }
      return buffer;
  }

  startGame() {
    try {
       const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
       if (AudioContextClass && !this.audioCtx) {
           this.audioCtx = new AudioContextClass();
           this.masterGain = this.audioCtx.createGain();
           this.masterGain.gain.value = 0.3;
           this.masterGain.connect(this.audioCtx.destination);
           this.noiseBuffer = this.createNoiseBuffer();
       }
       if (this.audioCtx && this.audioCtx.state === 'suspended') {
           this.audioCtx.resume();
       }
    } catch (e) {
       console.warn("Audio not supported");
    }

    const stats = this.getShipStats();
    this.gameStarted.set(true);
    this.restart();
  }

  screenShake(intensity: number) {
    this.shakeIntensity = intensity;
  }

  playKick() {
      if (!this.audioCtx || !this.masterGain) return;
      const t = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(0.01, t + 0.5);
      gain.gain.setValueAtTime(1.5, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
      osc.start(t);
      osc.stop(t + 0.5);
  }

  playSnare() {
      if (!this.audioCtx || !this.masterGain || !this.noiseBuffer) return;
      const t = this.audioCtx.currentTime;

      // Noise burst
      const noiseSrc = this.audioCtx.createBufferSource();
      noiseSrc.buffer = this.noiseBuffer;
      const noiseFilter = this.audioCtx.createBiquadFilter();
      noiseFilter.type = 'highpass';
      noiseFilter.frequency.value = 1000;
      const noiseGain = this.audioCtx.createGain();

      noiseGain.gain.setValueAtTime(0.5, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

      noiseSrc.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.masterGain);

      noiseSrc.start(t);
      noiseSrc.stop(t + 0.2);

      // Body tone
      const osc = this.audioCtx.createOscillator();
      const oscGain = this.audioCtx.createGain();
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(50, t + 0.1);
      oscGain.gain.setValueAtTime(0.6, t);
      oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
      osc.connect(oscGain);
      oscGain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.1);
  }

  playHiHat() {
      if (!this.audioCtx || !this.masterGain) return;
      const t = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(8000, t);
      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 7000;
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
      osc.start(t);
      osc.stop(t + 0.05);
  }

  playShootSynth(noteIndex: number, isPerfect = false) {
      if (!this.audioCtx || !this.masterGain) return;
      const t = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      
      const isHighDmg = this.weaponLevel > 5;
      osc.type = isPerfect ? 'sawtooth' : (isHighDmg ? 'sawtooth' : 'square');
      
      // Choose base frequency. If perfect, jump an octave.
      const multiplier = (isHighDmg ? 2 : 1) * (isPerfect ? 2 : 1);
      const freq = this.scale[noteIndex % this.scale.length] * multiplier;
      
      osc.frequency.setValueAtTime(freq, t);
      if (!isHighDmg && !isPerfect) {
          osc.frequency.exponentialRampToValueAtTime(freq / 2, t + 0.1);
      }
      
      const filter = this.audioCtx.createBiquadFilter();
      filter.type = isPerfect ? 'bandpass' : 'lowpass';
      filter.frequency.setValueAtTime(isPerfect ? 4000 : 2000, t);
      filter.frequency.linearRampToValueAtTime(100, t + (isPerfect ? 0.3 : 0.1));
      if (isPerfect) filter.Q.value = 5;
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      
      gain.gain.setValueAtTime(isPerfect ? 0.1 : 0.04, t);
      gain.gain.linearRampToValueAtTime(0, t + (isPerfect ? 0.3 : 0.1));
      
      osc.start(t);
      osc.stop(t + (isPerfect ? 0.3 : 0.1));
  }

  playBassSynth(chordIndex: number, step: number) {
      if (!this.audioCtx || !this.masterGain) return;
      const t = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'triangle';
      
      // Chords: 0=Cm, 1=Ab, 2=Fm, 3=Gm
      const rootNotes = [261.63, 207.65, 174.61, 196.00]; 
      const chordOffsets = [
          [0, 3, 7, 10], // minor 7th
          [0, 4, 7, 11], // major 7th
          [0, 3, 7, 10], // minor 7th
          [0, 3, 7, 10]  // minor 7th
      ]; 
      
      const offsets = chordOffsets[chordIndex % chordOffsets.length];
      const noteOffset = offsets[step % 4]; 
      
      const freq = (rootNotes[chordIndex % rootNotes.length] * Math.pow(2, noteOffset / 12)) / 2;
      
      osc.frequency.setValueAtTime(freq, t);
      
      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, t);
      filter.frequency.exponentialRampToValueAtTime(100, t + 0.2);
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.2);
      
      osc.start(t);
      osc.stop(t + 0.2);
  }

  playExplosionSynth(isBoss = false) {
      if (!this.audioCtx || !this.masterGain) return;
      const t = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'square';
      
      const multiplier = isBoss ? 0.5 : 1;
      const freq = this.scale[0 % this.scale.length] * multiplier;
      
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(10, t + (isBoss ? 0.6 : 0.2));
      
      osc.connect(gain);
      gain.connect(this.masterGain);
      gain.gain.setValueAtTime(isBoss ? 0.4 : 0.15, t);
      gain.gain.linearRampToValueAtTime(0, t + (isBoss ? 0.6 : 0.2));
      
      osc.start(t);
      osc.stop(t + (isBoss ? 0.6 : 0.2));
  }

  initStars() {
    this.stars = [];
    for (let i = 0; i < 200; i++) {
       this.stars.push({
           x: Math.random() * this.width,
           y: Math.random() * this.height,
           size: Math.random() * 1.5 + 0.5,
           speed: Math.random() * 8 + 1,
           alpha: Math.random() * 0.8 + 0.2,
           type: Math.random() > 0.8 ? 'foreground' : 'background'
       });
    }
  }

  recentTokensEarned = 0;

  triggerGameOver() {
      this.recentTokensEarned = Math.floor(this.score() / 10);
      this.coins.update(c => c + this.recentTokensEarned);
      this.saveGameData();
      this.gameOver.set(true);
  }

  returnToHangar() {
      this.gameOver.set(false);
      this.gameStarted.set(false);
      this.player = { x: -1000, y: -1000 };
  }

  extractBlueprints() {
      const fullBp = this.blueprint();
      this.playerBp = [];
      this.activeWingmen = [];

      const visited = new Set<string>();
      const key = (p: any) => `${p.x},${p.y}`;
      
      const bfs = (startX: number, startY: number) => {
          const bp: any[] = [];
          const queue = [fullBp.find(p => p.x === startX && p.y === startY)].filter(Boolean) as any[];
          while(queue.length > 0) {
              const curr = queue.shift()!;
              const k = key(curr);
              if (visited.has(k)) continue;
              visited.add(k);
              bp.push(curr);
              
              for (const other of fullBp) {
                  if (!visited.has(key(other))) {
                      if (Math.abs(curr.x - other.x) + Math.abs(curr.y - other.y) === 1) {
                          queue.push(other);
                      }
                  }
              }
          }
          return bp;
      };

      this.playerBp = bfs(0, 0);
      
      for (const p of fullBp) {
          if (p.partId === 'wingman_core' && !visited.has(key(p))) {
              const wingmanBp = bfs(p.x, p.y);
              const stats = this.getShipStats(wingmanBp);
              const core = wingmanBp.find(b => b.partId === 'wingman_core')!;
              const shiftedBp = wingmanBp.map(b => ({...b, x: b.x - core.x, y: b.y - core.y}));
              
              this.activeWingmen.push({
                  x: this.player.x + (Math.random() - 0.5) * 100,
                  y: this.player.y + (Math.random() - 0.5) * 100,
                  vx: 0,
                  vy: 0,
                  bp: shiftedBp,
                  hp: stats.hp,
                  maxHp: stats.hp,
                  weapons: this.getShipStats(shiftedBp).weapons,
                  speed: stats.speed + 3,
                  lastShotTime: 0,
                  angleOffset: Math.random() * Math.PI * 2,
                  orbitRadius: 120 + Math.random() * 80
              });
          }
      }
  }

  restart() {
    this.extractBlueprints();
    this.score.set(0);
    this.startFlashTimer = 3000;
    this.health.set(this.getShipStats(this.playerBp).hp);
    this.wave.set(1);
    
    // Initial music scale & BPM
    this.scale = [261.63, 311.13, 349.23, 392.00, 466.16, 523.25]; // C Min Pentatonic
    this.bpm = 130;
    this.beatInterval = 60000 / this.bpm;
    this.tickInterval = this.beatInterval / 4;

    this.empCooldown.set(0);
    this.grazeEnergy.set(0);
    this.singularityActive = false;
    this.singularityTimer = 0;
    this.waveTimer = 3000;
    this.enemiesToSpawn = 10;
    this.enemiesSpawned = 0;
    this.invulnerableTimer = 2000;
    this.gameOver.set(false);
    this.bullets = [];
    this.enemyBullets = [];
    this.enemies = [];
    this.particles = [];
    this.powerUps = [];
    this.floatingTexts = [];
    this.weaponLevel = 1;
    this.hasShield = false;
    this.hasPierce = false;
    this.bossSpawned = false;
    this.showUpgradeUI.set(false);
    this.freezeTimer = 0;
    this.orbitTimer = 0;
    this.laserTimer = 0;
    this.orbitAngle = 0;
    this.spawnRate = 1200;
    this.lastFrameTime = performance.now();
    this.mouseDown = false;
    this.loop(performance.now());
  }

  bossHpPercent() {
      const boss = this.enemies.find(e => e.type?.endsWith('_boss'));
      if (!boss || !boss.hp || !boss.maxHp) return 0;
      return Math.max(0, (boss.hp / boss.maxHp) * 100);
  }

  loop(timestamp: number) {
    const dt = timestamp - this.lastFrameTime;
    this.lastFrameTime = timestamp;

    this.updateBackground(dt);

    if (this.gameStarted() && !this.gameOver()) {
      this.update(dt, timestamp);
    }
    
    this.draw();
    this.animationId = requestAnimationFrame((t) => this.loop(t));
  }

  processTick(tickIndex: number) {
      const step = tickIndex % 16;
      if (step === 0) {
          this.measure++;
          if (this.measure % 4 === 0) {
              this.currentChord = (this.currentChord + 1) % 4;
          }
          this.playKick();
      } else if (step === 4) {
          this.playSnare();
      } else if (step === 8) {
          this.playKick();
      } else if (step === 12) {
          this.playSnare();
      }
      
      if (step % 2 === 0) {
          this.playHiHat();
      }

      this.playBassSynth(this.currentChord, step);

      // Spawn enemies on beat
      if (step % 4 === 0 && this.waveTimer <= 0 && this.enemiesSpawned < this.enemiesToSpawn) {
          const spawnChance = this.wave() > 4 ? 0.3 : 0;
          this.spawnEnemy();
          if (Math.random() < spawnChance && this.enemiesSpawned < this.enemiesToSpawn) {
              setTimeout(() => this.spawnEnemy(), this.tickInterval * 2);
          }
      }
  }
  
  weaponsLastShot: Record<string, number> = {};

  fireWeapon(timestamp: number) {
      const stats = this.getShipStats();
      let firedAny = false;
      const numProjectiles = this.weaponLevel;
      const spread = Math.min(Math.PI * 2, 0.15 + (numProjectiles - 1) * 0.1);
      const isCircle = spread >= Math.PI * 2;
      
      // Global fire rate multiplier for upgrades. Default to 1.
      const bonusRate = 1 + (this.weaponLevel * 0.1);

      for (let wIdx = 0; wIdx < stats.weapons.length; wIdx++) {
          const w = stats.weapons[wIdx];
          const weaponKey = `${w.x}_${w.y}`;
          const lastShot = this.weaponsLastShot[weaponKey] || 0;
          const interval = 1000 / (w.def.fireRate * bonusRate);
          
          if (timestamp - lastShot > interval) {
              this.weaponsLastShot[weaponKey] = timestamp;
              firedAny = true;
              
              const px = this.player.x + w.x * 8;
              const py = this.player.y + w.y * 8 - 10;
              
              for (let i = 0; i < numProjectiles; i++) {
                 let angleOffset = 0;
                 if (numProjectiles > 1) {
                     const actualSpread = isCircle ? Math.PI * 2 : spread;
                     angleOffset = -actualSpread / 2 + (actualSpread / (isCircle ? numProjectiles : numProjectiles - 1)) * i;
                 }
                 const vx = Math.sin(angleOffset) * 18;
                 const vy = -Math.cos(angleOffset) * 18;
                 this.bullets.push({
                   x: px,
                   y: py,
                   vx: vx,
                   vy: vy,
                   radius: Math.min(8, 3 + this.weaponLevel * 0.15),
                   color: w.def.color,
                   damage: (1 + Math.floor(this.weaponLevel / 3)) * w.def.damage
                 });
              }
          }
      }
      if (firedAny) {
          this.playShootSynth(0, false); 
      }
  }

  spawnBoss() {
      const w = this.wave();
      const bossTypes = [
          'circle_boss', 'square_boss', 'triangle_boss', 'pentagon_boss', 
          'hexagon_boss', 'star_boss', 'diamond_boss', 'omega_boss',
          'nova_boss', 'pulsar_boss', 'quasar_boss', 'nebula_boss',
          'eclipse_boss', 'singularity_boss', 'void_boss', 'genesis_boss', 'eternal_boss'
      ];
      const type = bossTypes[Math.min(w - 1, bossTypes.length - 1)];
      const size = 60 + Math.min(w, 15) * 8;
      let hp = 500 + w * 400 + (w >= 8 ? 2000 : 0) + (w >= 15 ? 10000 : 0);
      
      // Later waves have insane HP
      hp *= (1 + (w * 0.15));

      this.enemies.push({
          x: this.width / 2,
          y: -size - 20,
          vx: 0,
          vy: 2 + w * 0.1, // Initially move down slowly
          radius: size,
          color: w >= 15 ? '#111827' : (w >= 8 ? '#f43f5e' : '#ef4444'),
          hp: hp,
          maxHp: hp,
          type: type,
          state: 'entering' // custom state
      });
      this.playExplosionSynth(true);
      this.screenShake(40);
      this.floatingTexts.push({x: this.width/2, y: this.height/3, vy: -1, text: w >= 15 ? '【神级首领降临】' : (w >= 8 ? '终极首领接近中' : '首领接近中'), color: w >= 15 ? '#a855f7' : (w >= 8 ? '#f43f5e' : '#ef4444'), life: 3000, maxLife: 3000});
  }

  generateUpgrades() {
      const upgradePool = [
          { name: '射速提升', icon: 'speed', desc: '提升武器开火速度', type: 'fire_rate' },
          { name: '最大生命 +1', icon: 'favorite', desc: '提升最大耐久度', type: 'max_health' },
          { name: '武器伤害', icon: 'whatshot', desc: '增加子弹威力和弹丸数量', type: 'weapon_dmg' },
          { name: '多重射击', icon: 'transform', desc: '增加额外的武器子弹', type: 'multishot' },
          { name: '轨道无人机', icon: 'satellite', desc: '增加一个环绕护体无人机', type: 'orbital' },
          { name: '激光射线', icon: 'bolt', desc: '周期性发射前方穿透激光', type: 'laser' }
      ];
      
      // select 3 unique random upgrades
      const shuffled = upgradePool.sort(() => Math.random() - 0.5);
      this.upgradeOptions = shuffled.slice(0, 3);
      this.showUpgradeUI.set(true);
  }

  fireRateMultiplier = 1;

  selectUpgrade(upgradeType: string) {
      if (upgradeType === 'fire_rate') this.fireRateMultiplier *= 1.2;
      else if (upgradeType === 'max_health') this.health.update(h => h + 1);
      else if (upgradeType === 'weapon_dmg') this.weaponLevel += 2;
      else if (upgradeType === 'multishot') this.weaponLevel++;
      else if (upgradeType === 'orbital') this.orbitTimer = Infinity;
      else if (upgradeType === 'laser') this.laserTimer = Infinity;

      this.showUpgradeUI.set(false);
      this.wave.update(w => w + 1);
      
      // Update music scale & BPM
      const scales = [
          [261.63, 311.13, 349.23, 392.00, 466.16, 523.25], // C Min Pentatonic
          [220.00, 246.94, 261.63, 293.66, 329.63, 349.23], // A Aeolian
          [164.81, 174.61, 207.65, 220.00, 246.94, 261.63], // E Phrygian Dom
          [196.00, 220.00, 233.08, 261.63, 293.66, 311.13]  // G Dorian
      ];
      this.scale = scales[(this.wave() - 1) % scales.length];
      this.bpm = 130 + (this.wave() - 1) * 5;
      this.beatInterval = 60000 / this.bpm;
      this.tickInterval = this.beatInterval / 4;
      
      this.waveTimer = 3000;
      this.enemiesToSpawn = 10 + this.wave() * 8 + Math.floor(Math.pow(this.wave(), 1.5));
      this.enemiesSpawned = 0;
      this.bossSpawned = false;
      this.floatingTexts.push({x: this.width/2, y: this.height/2, vy: -1, text: '第 ' + this.wave() + ' 波', color: '#10b981', life: 2000, maxLife: 2000});
  }
  spawnEnemy() {
      const difficultyMult = Math.min(5, 1 + this.wave() * 0.2);
      const randType = Math.random();
      let type = 'normal';
      let size = Math.random() * 25 + 15;
      let hpMult = 1;
      let speedMult = 1;

      if (randType > 0.8) {
        type = 'tank';
        size = 35 + Math.random() * 20;
        hpMult = 2 + this.wave() * 0.2;
        speedMult = 0.5;
      } else if (randType > 0.65) {
        type = 'fast';
        size = 12 + Math.random() * 8;
        hpMult = 0.5;
        speedMult = 1.8;
      } else if (randType > 0.5) {
         type = 'swarmer';
         size = 8 + Math.random() * 6;
         hpMult = 0.2;
         speedMult = 1.5;
      } else if (randType > 0.4) {
         type = 'jumper';
         size = 20 + Math.random() * 10;
         hpMult = 2;
         speedMult = 0.8;
      } else if (randType > 0.3) {
         type = 'shooter';
         size = 25 + Math.random() * 10;
         hpMult = 3;
         speedMult = 0.6;
      } else if (randType > 0.2 && this.wave() > 1) {
         type = 'stealth';
         size = 18 + Math.random() * 5;
         hpMult = 2.5;
         speedMult = 1.2;
      }

      const count = type === 'swarmer' ? 3 + Math.floor(Math.random() * 4) : 1;
      
      for(let k=0; k<count; k++) {
        if (this.enemiesSpawned >= this.enemiesToSpawn) break;
        this.enemiesSpawned++;
        
        const actualSize = size + (Math.random() * 5 - 2.5);
        // Base HP is much lower, depending more on wave, giving it a snappier rhythm game feel
        const hp = Math.max(1, Math.floor((actualSize / 15) * hpMult) + Math.floor(this.wave() * 1.0));
        const x = Math.random() * (this.width - actualSize * 2) + actualSize;
        const y = -actualSize - 10 - (k * 20);

        this.enemies.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 4 * difficultyMult * speedMult,
          vy: (Math.random() * 2 + 2) * difficultyMult * speedMult,
          radius: actualSize,
          color: type === 'boss' ? '#ef4444' : type === 'tank' ? '#f97316' : type === 'fast' ? '#06b6d4' : type === 'swarmer' ? '#a855f7' : type === 'jumper' ? '#eab308' : type === 'shooter' ? '#14b8a6' : type === 'stealth' ? '#64748b' : '#10b981',
          hp, maxHp: hp, type
        });
      }
  }

  updateBackground(dt: number) {
    const timeScale = this.singularityActive ? 0.15 : 1.0;
    const baseSpeed = this.gameStarted() ? this.getShipStats().speed : 1;
    for (const star of this.stars) {
      const speedMult = this.gameStarted() ? (star.type === 'foreground' ? 3 * baseSpeed : 1 * baseSpeed) : 0.2;
      star.y += star.speed * speedMult * timeScale * (dt / 16);
      
      if (this.singularityActive) {
         const dx = this.player.x - star.x;
         const dy = this.player.y - star.y;
         star.x += dx * 0.01 * timeScale;
         star.y += dy * 0.01 * timeScale;
      }
      if (star.y > this.height) {
        star.y = 0;
        star.x = Math.random() * this.width;
      }
    }
    if (this.shakeIntensity > 0) this.shakeIntensity *= 0.9;
  }

  update(dt: number, time: number) {
    if (this.startFlashTimer > 0) this.startFlashTimer -= dt;
    const timeScale = this.singularityActive ? 0.15 : 1.0;

    if (this.singularityActive) {
        this.singularityTimer -= dt;
        if (this.singularityTimer <= 0) {
            this.singularityActive = false;
            this.createExplosion(this.player.x, this.player.y, 150, '#d946ef');
            this.screenShake(60);
            this.score.update(s => s + 2000);
            this.floatingTexts.push({x: this.player.x, y: this.player.y, vy: -2, text: '奇点坍缩', color: '#d946ef', life: 2000, maxLife: 2000});
            
            for (let i = this.enemies.length - 1; i >= 0; i--) {
                const e = this.enemies[i];
                if(Math.hypot(e.x - this.player.x, e.y - this.player.y) < 400) {
                    e.hp! -= 100;
                    if (e.hp! <= 0) {
                        this.addKillScore(20);
                        this.createExplosion(e.x, e.y, 50, e.color);
                        this.enemies.splice(i, 1);
                    }
                }
            }
        }
    }

    const gameDt = dt * timeScale;
    
    // Rhythm Update
    const currentTickIndex = Math.floor(time / this.tickInterval);
    
    if (this.lastTickIndex === -1) {
        this.lastTickIndex = currentTickIndex;
        this.processTick(currentTickIndex);
    } else if (currentTickIndex > this.lastTickIndex) {
        const ticksMissed = currentTickIndex - this.lastTickIndex;
        // if tab was inactive we might miss a lot of ticks, don't play hundreds of sounds
        for (let i = Math.max(1, ticksMissed - 4); i <= ticksMissed; i++) {
            this.processTick(this.lastTickIndex + i);
        }
        this.lastTickIndex = currentTickIndex;
    }
    
    // Pulse based on beats (every 4 ticks)
    this.beatPulse.set(Math.max(0, 1 - ((time % this.beatInterval) / this.beatInterval)));

    if (this.invulnerableTimer > 0) this.invulnerableTimer -= dt;
    if (this.freezeTimer > 0) this.freezeTimer -= gameDt;
    if (this.empCooldown() > 0) this.empCooldown.update(c => Math.max(0, c - dt));
    if (this.orbitTimer > 0) {
       this.orbitTimer -= dt;
       this.orbitAngle += dt * 0.005;
    }
    if (this.laserTimer > 0) {
       this.laserTimer -= dt;
       for (let i = this.enemies.length - 1; i >= 0; i--) {
           const e = this.enemies[i];
           if (Math.abs(e.x - this.player.x) < e.radius + 15 && e.y < this.player.y) {
               e.hp! -= 1.5;
               if (e.hp! <= 0) {
                 this.addKillScore(10);
                 this.createExplosion(e.x, e.y, 40, e.color);
                 if (e.type?.endsWith('_boss')) this.screenShake(20);
                 this.enemies.splice(i, 1);
               } else if (Math.random() < 0.2) {
                 this.createExplosion(e.x, e.y + e.radius, 2, e.color);
               }
           }
       }
    }
    
    if (this.orbitTimer > 0) {
        const orbitRadius = 60;
        const o1 = { x: this.player.x + Math.cos(this.orbitAngle) * orbitRadius, y: this.player.y + Math.sin(this.orbitAngle) * orbitRadius };
        const o2 = { x: this.player.x + Math.cos(this.orbitAngle + Math.PI) * orbitRadius, y: this.player.y + Math.sin(this.orbitAngle + Math.PI) * orbitRadius };
        
        for (let i = this.enemies.length - 1; i >= 0; i--) {
           const e = this.enemies[i];
           if (Math.hypot(e.x - o1.x, e.y - o1.y) < e.radius + 10 || Math.hypot(e.x - o2.x, e.y - o2.y) < e.radius + 10) {
               e.hp! -= 1;
               if (e.hp! <= 0) {
                 this.addKillScore(10);
                 this.createExplosion(e.x, e.y, 40, e.color);
                 if (e.type?.endsWith('_boss')) this.screenShake(20);
                 this.enemies.splice(i, 1);
               } else if (Math.random() < 0.2) {
                 this.createExplosion(e.x, e.y, 2, e.color);
               }
           }
        }
    }
    
    // Thruster particles
    const thrusterCount = Math.floor(1 + this.beatPulse() * 4);
    for (let i = 0; i < thrusterCount; i++) {
        if (Math.random() < 0.6) {
            this.particles.push({
                x: this.player.x + (Math.random() - 0.5) * 12,
                y: this.player.y + 15,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() * 4 + 4) * (1 + this.beatPulse() * 0.5),
                life: 200 + Math.random() * 200,
                maxLife: 400,
                color: '#3b82f6',
                size: (Math.random() * 3 + 1) * (1 + this.beatPulse() * 0.3),
                alpha: 1
            });
        }
    }

    // Firing logic
    if (this.gameStarted() && this.mouseDown && !this.singularityActive) {
       this.fireWeapon(performance.now());
    }

    if (this.gameStarted() && !this.gameOver() && !this.singularityActive) {
        for (const w of this.activeWingmen) {
            // Move: Orbit around player, but offset slightly
            w.angleOffset += 0.05 * (dt / 16) * (Math.random() > 0.5 ? 1 : 0.9); // Small fluctuation
            const targetX = this.player.x + Math.cos(w.angleOffset) * w.orbitRadius;
            const targetY = this.player.y + Math.sin(w.angleOffset) * w.orbitRadius;
            
            const dx = targetX - w.x;
            const dy = targetY - w.y;
            const dist = Math.hypot(dx, dy);
            
            w.vx += (dx / Math.max(1, dist)) * w.speed * 0.1;
            w.vy += (dy / Math.max(1, dist)) * w.speed * 0.1;
            
            w.vx *= 0.85; // friction
            w.vy *= 0.85;
            
            w.x += w.vx;
            w.y += w.vy;

            // Engine particles for wingmen
            if (this.mouseDown && Math.random() < 0.3) {
                this.particles.push({
                   x: w.x + (Math.random() - 0.5) * 6,
                   y: w.y + 10,
                   vx: (Math.random() - 0.5), vy: Math.random() * 2 + 2,
                   life: 150, maxLife: 150,
                   color: '#fde047', size: 2, alpha: 1
                });
            }

            // Wingman Firing logic
            if (time - w.lastShotTime > 400 * (1 / this.weaponLevel)) { // Auto fire
                let firedAny = false;
                for (const wp of w.weapons) {
                    // Try to aim at closest enemy
                    let closestE = null;
                    let closestDist = Infinity;
                    for (const e of this.enemies) {
                        const ed = Math.hypot(e.x - w.x, e.y - w.y);
                        if (ed < closestDist) { closestDist = ed; closestE = e; }
                    }

                    if (!closestE || closestDist > 600) continue; // Only fire if target in range

                    const aimAngle = Math.atan2(closestE.y - w.y, closestE.x - w.x);

                    const bSpeed = 15;
                    this.bullets.push({
                        x: w.x + wp.x * 8, y: w.y + wp.y * 8,
                        vx: Math.cos(aimAngle) * bSpeed,
                        vy: Math.sin(aimAngle) * bSpeed,
                        radius: 4 + wp.def.damage,
                        color: wp.def.color,
                        damage: wp.def.damage * this.weaponLevel
                    });
                    this.playShootSynth(1, false);
                    firedAny = true;
                }
                if (firedAny) {
                    w.lastShotTime = time;
                }
            }
        }
    }

    if (this.showUpgradeUI()) return; // Pause game logic during upgrade selection

    if (this.waveTimer > 0) {
        this.waveTimer -= dt;
    } else if (this.enemiesSpawned >= this.enemiesToSpawn && this.enemies.length === 0) {
        if (!this.bossSpawned) {
             this.spawnBoss();
             this.bossSpawned = true;
        } else {
             // Boss is dead
             this.score.update(s => s + 500 * this.wave());
             this.generateUpgrades();
        }
    }

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx; b.y += b.vy;
      if (b.y < -50 || b.x < -50 || b.x > this.width + 50) this.bullets.splice(i, 1);
    }
    
    const enemyBulletMod = (this.freezeTimer > 0 ? 0.4 : 1) * timeScale;
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const b = this.enemyBullets[i];
      
      if (this.singularityActive) {
          const dx = this.player.x - b.x;
          const dy = this.player.y - b.y;
          const dist = Math.hypot(dx, dy);
          b.x += (dx/dist) * 12;
          b.y += (dy/dist) * 12;
          if (dist < 30) {
              this.createExplosion(b.x, b.y, 2, '#d946ef');
              this.enemyBullets.splice(i, 1);
              this.score.update(s => s + 5);
              continue;
          }
      } else if (b.homing && !this.gameOver()) {
          const targetAngle = Math.atan2(this.player.y - b.y, this.player.x - b.x);
          const currentAngle = Math.atan2(b.vy, b.vx);
          const speed = Math.hypot(b.vx, b.vy);
          let angleDiff = targetAngle - currentAngle;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
          
          const maxTurn = 0.1 * enemyBulletMod;
          const newAngle = currentAngle + Math.max(-maxTurn, Math.min(maxTurn, angleDiff));
          b.vx = Math.cos(newAngle) * speed;
          b.vy = Math.sin(newAngle) * speed;
      }
      
      if (b.life !== undefined) {
         b.life -= dt;
         if (b.life <= 0) {
             this.createExplosion(b.x, b.y, 8, b.color);
             this.enemyBullets.splice(i, 1);
             continue;
         }
      }
      
      b.x += b.vx * enemyBulletMod; b.y += b.vy * enemyBulletMod;
      if (b.y > this.height + 50 || b.x < -50 || b.x > this.width + 50 || b.y < -50) {
          this.enemyBullets.splice(i, 1);
          continue;
      }
      const distHit = Math.hypot(b.x - this.player.x, b.y - this.player.y);
      let hitWingman = false;
      for (let wIdx = this.activeWingmen.length - 1; wIdx >= 0; wIdx--) {
          const w = this.activeWingmen[wIdx];
          if (Math.hypot(b.x - w.x, b.y - w.y) < b.radius + 20) {
              hitWingman = true;
              this.enemyBullets.splice(i, 1);
              w.hp -= 1;
              this.createExplosion(b.x, b.y, 20, '#f43f5e');
              if (w.hp <= 0) {
                  this.createExplosion(w.x, w.y, 50, '#3b82f6');
                  this.activeWingmen.splice(wIdx, 1);
              }
              break;
          }
      }
      if (hitWingman) continue;

      if (distHit < b.radius + 25 && this.invulnerableTimer <= 0 && !this.singularityActive) {
          this.enemyBullets.splice(i, 1);
          if (this.hasShield) {
              this.hasShield = false;
              this.weaponLevel = Math.max(1, this.weaponLevel - 1);
              this.createExplosion(b.x, b.y, 20, '#8b5cf6');
              this.screenShake(10);
              this.invulnerableTimer = 1000;
          } else {
              this.health.update(h => h - 1);
              this.createExplosion(this.player.x, this.player.y, 30, '#f43f5e');
              this.screenShake(20);
              if (this.health() <= 0) {
                  this.createExplosion(this.player.x, this.player.y, 100, '#ffffff');
                  this.screenShake(50);
                  this.triggerGameOver();
                  return;
              }
              this.invulnerableTimer = 2000;
              this.weaponLevel = Math.max(1, this.weaponLevel - 1);
          }
      } else if (distHit < b.radius + 70 && !(b as any).grazed && !this.singularityActive) {
          (b as any).grazed = true;
          this.grazeEnergy.update(g => Math.min(100, g + 15));
          this.score.update(s => s + 15);
          this.floatingTexts.push({x: this.player.x, y: this.player.y - 30, vy: -1.5, text: '擦弹', color: '#d946ef', life: 400, maxLife: 400});
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx; p.y += p.vy;
      p.life -= dt;
      p.alpha = Math.max(0, p.life / p.maxLife);
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy * (dt / 16);
      ft.life -= dt;
      if (ft.life <= 0) this.floatingTexts.splice(i, 1);
    }

    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const p = this.powerUps[i];
      p.y += p.vy;
      p.pulse += dt;
      if (p.y > this.height + p.radius) {
        this.powerUps.splice(i, 1);
        continue;
      }
      const distPlayer = Math.hypot(p.x - this.player.x, p.y - this.player.y);
      if (distPlayer < p.radius + 15) {
        if (p.type === 'weapon') {
          this.weaponLevel++;
          this.score.update(s => s + 50);
          this.createExplosion(p.x, p.y, 20, p.color);
          this.floatingTexts.push({x: p.x, y: p.y, vy: -1.5, text: '武器升级', color: p.color, life: 1200, maxLife: 1200});
        } else if (p.type === 'bomb') {
          this.score.update(s => s + this.enemies.length * 10);
          for(const e of this.enemies) this.createExplosion(e.x, e.y, 20, e.color);
          this.enemies = [];
          this.enemyBullets = [];
          this.createExplosion(this.width/2, this.height/2, 100, p.color);
          this.screenShake(30);
          this.floatingTexts.push({x: p.x, y: p.y, vy: -1.5, text: '新星炸弹', color: p.color, life: 1200, maxLife: 1200});
        } else if (p.type === 'shield') {
          this.hasShield = true;
          this.score.update(s => s + 50);
          this.createExplosion(p.x, p.y, 20, p.color);
          this.floatingTexts.push({x: p.x, y: p.y, vy: -1.5, text: '护盾已启动', color: p.color, life: 1200, maxLife: 1200});
        } else if (p.type === 'pierce') {
          this.hasPierce = true;
          this.score.update(s => s + 50);
          this.createExplosion(p.x, p.y, 20, p.color);
          this.floatingTexts.push({x: p.x, y: p.y, vy: -1.5, text: '穿甲弹', color: p.color, life: 1200, maxLife: 1200});
        } else if (p.type === 'freeze') {
          this.freezeTimer = 5000;
          this.score.update(s => s + 50);
          this.createExplosion(p.x, p.y, 20, p.color);
          this.floatingTexts.push({x: p.x, y: p.y, vy: -1.5, text: '时间冻结', color: p.color, life: 1200, maxLife: 1200});
        } else if (p.type === 'orbit') {
          this.orbitTimer = 10000;
          this.score.update(s => s + 50);
          this.createExplosion(p.x, p.y, 20, p.color);
          this.floatingTexts.push({x: p.x, y: p.y, vy: -1.5, text: '战斗轨道', color: p.color, life: 1200, maxLife: 1200});
        } else if (p.type === 'laser') {
          this.laserTimer = 4000;
          this.score.update(s => s + 50);
          this.createExplosion(p.x, p.y, 20, p.color);
          this.floatingTexts.push({x: p.x, y: p.y, vy: -1.5, text: '死亡射线', color: p.color, life: 1200, maxLife: 1200});
        } else if (p.type === 'health') {
          this.health.update(h => Math.min(this.getShipStats().hp, h + 1));
          this.score.update(s => s + 50);
          this.createExplosion(p.x, p.y, 20, p.color);
          this.floatingTexts.push({x: p.x, y: p.y, vy: -1.5, text: '装甲已修复', color: p.color, life: 1200, maxLife: 1200});
        }
        if (!this.singularityActive) {
            this.grazeEnergy.update(g => Math.min(100, g + 10));
        }
        this.powerUps.splice(i, 1);
      }
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      const speedMod = (this.freezeTimer > 0 ? 0.2 : 1) * timeScale;
      
      if (this.singularityActive && e.type !== 'boss') {
          const dx = this.player.x - e.x;
          const dy = this.player.y - e.y;
          e.x += dx * 0.02;
          e.y += dy * 0.02;
      }
      
      if (e.type === 'jumper' && Math.random() < 0.02 * speedMod) {
          e.x += (Math.random() - 0.5) * 150;
          this.createExplosion(e.x, e.y, 5, e.color);
      }
      if (e.type === 'shooter' && Math.random() < 0.01 * speedMod) {
          // shoot towards player
          const angle = Math.atan2(this.player.y - e.y, this.player.x - e.x);
          this.enemyBullets.push({
             x: e.x, y: e.y, vx: Math.cos(angle)*6, vy: Math.sin(angle)*6, radius: 4, color: '#f87171'
          });
      }

      if (e.state === 'entering') {
          if (e.y > 100) { e.state = 'fighting'; e.vy = 0; e.vx = 2 + this.wave() * 0.5; }
      } else if (e.type?.endsWith('_boss')) {
          // Boss logic
          let attackRate = 0.15;
          if (e.type === 'omega_boss') attackRate = 0.35;
          else if (e.type === 'nova_boss' || e.type === 'pulsar_boss' || e.type === 'quasar_boss') attackRate = 0.45;
          else if (e.type === 'nebula_boss' || e.type === 'eclipse_boss' || e.type === 'singularity_boss') attackRate = 0.55;
          else if (e.type === 'void_boss' || e.type === 'genesis_boss' || e.type === 'eternal_boss') attackRate = 0.7;

          if (Math.random() < attackRate * speedMod) {
              // Boss shoots
              const angle = Math.atan2(this.player.y - e.y, this.player.x - e.x);
              
              if (Math.random() < 0.25 || e.type === 'quasar_boss' || e.type === 'genesis_boss' || e.type === 'eternal_boss') {
                  // Fire a tracking bullet
                  this.enemyBullets.push({x: e.x, y: e.y, vx: Math.cos(angle)*4, vy: Math.sin(angle)*4, radius: 12, color: '#ff0055', homing: true, life: 15000});
              }
              
              if (e.type === 'circle_boss') {
                  for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
                      this.enemyBullets.push({x: e.x, y: e.y, vx: Math.cos(a)*8, vy: Math.sin(a)*8, radius: 8, color: '#ef4444'});
                  }
              } else if (e.type === 'square_boss') {
                  this.enemyBullets.push({x: e.x, y: e.y, vx: Math.cos(angle)*12, vy: Math.sin(angle)*12, radius: 15, color: '#f97316'});
                  this.enemyBullets.push({x: e.x-30, y: e.y, vx: 0, vy: 12, radius: 8, color: '#f97316'});
                  this.enemyBullets.push({x: e.x+30, y: e.y, vx: 0, vy: 12, radius: 8, color: '#f97316'});
                  this.enemyBullets.push({x: e.x-60, y: e.y, vx: 0, vy: 12, radius: 8, color: '#f97316'});
                  this.enemyBullets.push({x: e.x+60, y: e.y, vx: 0, vy: 12, radius: 8, color: '#f97316'});
              } else if (e.type === 'triangle_boss') {
                  for(let k=0; k<7; k++) {
                     const aOff = angle + (Math.random() - 0.5) * 1.5;
                     this.enemyBullets.push({x: e.x, y: e.y, vx: Math.cos(aOff)*14, vy: Math.sin(aOff)*14, radius: 6, color: '#eab308'});
                  }
              } else if (e.type === 'pentagon_boss') {
                  for(let a = 0; a < Math.PI * 2; a += Math.PI * 2 / 10) {
                      const spin = this.lastFrameTime / 300;
                      this.enemyBullets.push({x: e.x, y: e.y, vx: Math.cos(a+spin)*9, vy: Math.sin(a+spin)*9, radius: 10, color: '#10b981'});
                  }
              } else if (e.type === 'hexagon_boss') {
                  for (let i = -4; i <= 4; i++) {
                      this.enemyBullets.push({x: e.x + i*25, y: e.y, vx: 0, vy: 16, radius: 6, color: '#8b5cf6'});
                  }
              } else if (e.type === 'star_boss') {
                  for(let a = 0; a < Math.PI * 2; a += Math.PI * 2 / 10) {
                      this.enemyBullets.push({x: e.x, y: e.y, vx: Math.cos(angle+a)*10, vy: Math.sin(angle+a)*10, radius: 8, color: '#fcd34d'});
                  }
              } else if (e.type === 'diamond_boss') {
                  this.enemyBullets.push({x: e.x, y: e.y, vx: Math.cos(angle)*18, vy: Math.sin(angle)*18, radius: 25, color: '#38bdf8'});
                  this.enemyBullets.push({x: e.x, y: e.y, vx: Math.cos(angle + 0.3)*14, vy: Math.sin(angle + 0.3)*14, radius: 10, color: '#38bdf8'});
                  this.enemyBullets.push({x: e.x, y: e.y, vx: Math.cos(angle - 0.3)*14, vy: Math.sin(angle - 0.3)*14, radius: 10, color: '#38bdf8'});
                  if (Math.random() < 0.4) {
                      this.enemies.push({ x: e.x, y: e.y, vx: (Math.random() - 0.5)*15, vy: Math.random()*8, radius: 15, color: '#38bdf8', hp: 10, maxHp: 10, type: 'fast' });
                  }
              } else if (e.type === 'omega_boss') {
                  const mode = Math.floor(Math.random() * 7);
                  if (mode === 0) {
                      for (let a = 0; a < Math.PI * 2; a += Math.PI / 12) {
                          this.enemyBullets.push({x: e.x, y: e.y, vx: Math.cos(a)*9, vy: Math.sin(a)*9, radius: 10, color: '#ef4444'});
                      }
                  } else if (mode === 1) {
                      this.enemyBullets.push({x: e.x, y: e.y, vx: Math.cos(angle)*15, vy: Math.sin(angle)*15, radius: 18, color: '#f97316'});
                      for(let i=1; i<=3; i++) {
                          this.enemyBullets.push({x: e.x-40*i, y: e.y, vx: 0, vy: 14, radius: 10, color: '#f97316'});
                          this.enemyBullets.push({x: e.x+40*i, y: e.y, vx: 0, vy: 14, radius: 10, color: '#f97316'});
                      }
                  } else if (mode === 2) {
                      for(let k=0; k<9; k++) {
                         const aOff = angle + (Math.random() - 0.5) * 1.5;
                         this.enemyBullets.push({x: e.x, y: e.y, vx: Math.cos(aOff)*15, vy: Math.sin(aOff)*15, radius: 8, color: '#eab308'});
                      }
                  } else if (mode === 3) {
                      for(let a = 0; a < Math.PI * 2; a += Math.PI * 2 / 8) {
                          const spin = this.lastFrameTime / 150;
                          this.enemyBullets.push({x: e.x, y: e.y, vx: Math.cos(a+spin)*10, vy: Math.sin(a+spin)*10, radius: 14, color: '#10b981'});
                      }
                  } else if (mode === 4) {
                      for (let i = -5; i <= 5; i++) {
                          this.enemyBullets.push({x: e.x + i*30, y: e.y, vx: 0, vy: 18, radius: 8, color: '#8b5cf6'});
                      }
                  } else if (mode === 5) {
                      for(let a = 0; a < Math.PI * 2; a += Math.PI * 2 / 10) {
                          this.enemyBullets.push({x: e.x, y: e.y, vx: Math.cos(angle+a)*14, vy: Math.sin(angle+a)*14, radius: 12, color: '#fcd34d'});
                      }
                  } else if (mode === 6) {
                      this.enemyBullets.push({x: e.x, y: e.y, vx: Math.cos(angle)*22, vy: Math.sin(angle)*22, radius: 28, color: '#38bdf8'});
                      if (Math.random() < 0.6 && this.enemies.length < 25) {
                          this.enemies.push({ x: e.x, y: e.y, vx: (Math.random() - 0.5)*20, vy: Math.random()*10, radius: 15, color: '#f43f5e', hp: 5, maxHp: 5, type: 'tank' });
                      }
                  }
              } else if (e.type === 'nova_boss') {
                  for (let a = 0; a < Math.PI * 2; a += Math.PI / 10) {
                      this.enemyBullets.push({x: e.x, y: e.y, vx: Math.cos(a)*10, vy: Math.sin(a)*10, radius: 18, color: '#f59e0b'});
                      this.enemyBullets.push({x: e.x + Math.cos(a)*40, y: e.y + Math.sin(a)*40, vx: Math.cos(a)*14, vy: Math.sin(a)*14, radius: 6, color: '#fbbf24'});
                  }
              } else if (e.type === 'pulsar_boss') {
                  const spin1 = this.lastFrameTime / 100;
                  const spin2 = -this.lastFrameTime / 70;
                  this.enemyBullets.push({x: e.x, y: e.y, vx: Math.cos(spin1)*16, vy: Math.sin(spin1)*16, radius: 12, color: '#0ea5e9'});
                  this.enemyBullets.push({x: e.x, y: e.y, vx: Math.cos(spin2)*16, vy: Math.sin(spin2)*16, radius: 12, color: '#0284c7'});
                  if (Math.random() < 0.3) {
                      this.enemyBullets.push({x: e.x, y: e.y, vx: Math.cos(angle)*20, vy: Math.sin(angle)*20, radius: 15, color: '#38bdf8'});
                  }
              } else if (e.type === 'quasar_boss') {
                  for(let a = 0; a < Math.PI * 2; a += Math.PI * 2 / 12) {
                      const spin = this.lastFrameTime / 50;
                      this.enemyBullets.push({x: e.x, y: e.y, vx: Math.cos(a+spin)*12, vy: Math.sin(a+spin)*12, radius: 16, color: '#a855f7'});
                  }
                  this.enemyBullets.push({x: e.x, y: e.y, vx: Math.cos(angle)*8, vy: Math.sin(angle)*8, radius: 12, color: '#d946ef', homing: true, life: 10000});
              } else if (e.type === 'nebula_boss') {
                  for(let k=0; k<15; k++) {
                     const aOff = angle + (Math.random() - 0.5) * 3.14; // Full random spray towards player
                     this.enemyBullets.push({x: e.x, y: e.y, vx: Math.cos(aOff)*10, vy: Math.sin(aOff)*10, radius: Math.random()*15+5, color: '#10b981'});
                  }
              } else if (e.type === 'eclipse_boss') {
                  for (let i = -6; i <= 6; i++) {
                      this.enemyBullets.push({x: e.x + i*40, y: e.y, vx: 0, vy: 25, radius: 12, color: '#111827'}); // Very dark bullets
                  }
                  // And some lasers targeted at player
                  this.enemyBullets.push({x: e.x, y: e.y, vx: Math.cos(angle)*30, vy: Math.sin(angle)*30, radius: 5, color: '#dc2626'});
              } else if (e.type === 'singularity_boss') {
                  for(let a = 0; a < Math.PI * 2; a += Math.PI / 16) {
                      this.enemyBullets.push({x: e.x, y: e.y, vx: Math.cos(a)*18, vy: Math.sin(a)*18, radius: 6, color: '#000000'});
                  }
                  if (Math.random() < 0.8 && this.enemies.length < 30) {
                      this.enemies.push({ x: e.x, y: e.y, vx: (Math.random() - 0.5)*25, vy: Math.random()*15, radius: 12, color: '#6b7280', hp: 3, maxHp: 3, type: 'fast' });
                  }
              } else if (e.type === 'void_boss') {
                  // Teleport periodically
                  if (Math.random() < 0.05) {
                      e.x = Math.max(50, Math.min(this.width - 50, this.player.x + (Math.random()-0.5)*300));
                      e.y = Math.max(50, Math.min(this.height/2, this.player.y - 200 + (Math.random()-0.5)*100));
                  }
                  for(let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
                      this.enemyBullets.push({x: e.x, y: e.y, vx: Math.cos(a)*5, vy: Math.sin(a)*5, radius: 25, color: '#4c1d95', homing: true, life: 5000});
                  }
              } else if (e.type === 'genesis_boss' || e.type === 'eternal_boss') {
                  // Pure bullet hell chaos
                  const mode = Math.floor(Math.random() * 8);
                  if (mode === 0) {
                      for (let a = 0; a < Math.PI * 2; a += Math.PI / 16) {
                          this.enemyBullets.push({x: e.x, y: e.y, vx: Math.cos(a)*12, vy: Math.sin(a)*12, radius: 10, color: '#ef4444'});
                      }
                  } else if (mode === 1) {
                      this.enemyBullets.push({x: e.x, y: e.y, vx: Math.cos(angle)*30, vy: Math.sin(angle)*30, radius: 20, color: '#f97316'});
                      for(let i=1; i<=7; i++) {
                          this.enemyBullets.push({x: e.x-30*i, y: e.y, vx: 0, vy: 20, radius: 12, color: '#f97316'});
                          this.enemyBullets.push({x: e.x+30*i, y: e.y, vx: 0, vy: 20, radius: 12, color: '#f97316'});
                      }
                  } else if (mode === 2) {
                      for(let k=0; k<15; k++) {
                         const aOff = angle + (Math.random() - 0.5) * 2;
                         this.enemyBullets.push({x: e.x, y: e.y, vx: Math.cos(aOff)*25, vy: Math.sin(aOff)*25, radius: 8, color: '#eab308'});
                      }
                  } else if (mode === 3) {
                      for(let a = 0; a < Math.PI * 2; a += Math.PI * 2 / 12) {
                          const spin = this.lastFrameTime / 100;
                          this.enemyBullets.push({x: e.x, y: e.y, vx: Math.cos(a+spin)*15, vy: Math.sin(a+spin)*15, radius: 18, color: '#10b981'});
                      }
                  } else if (mode === 4 || mode === 5) {
                      for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
                          this.enemyBullets.push({x: e.x, y: e.y, vx: Math.cos(a)*4, vy: Math.sin(a)*4, radius: 30, color: '#a855f7', homing: true, life: 10000});
                      }
                  } else if (mode === 6) {
                      this.enemyBullets.push({x: e.x, y: e.y, vx: Math.cos(angle)*40, vy: Math.sin(angle)*40, radius: 40, color: '#ffffff'});
                      if (Math.random() < 0.8 && this.enemies.length < 50) {
                          this.enemies.push({ x: e.x, y: e.y, vx: (Math.random() - 0.5)*30, vy: Math.random()*15, radius: 20, color: '#f43f5e', hp: 10, maxHp: 10, type: 'tank' });
                      }
                  }
              }
          }
      }

      e.x += e.vx * speedMod; e.y += e.vy * speedMod;

      if (e.type?.endsWith('_boss') && e.state === 'fighting') {
           if (e.x < e.radius + 20 || e.x > this.width - e.radius - 20) e.vx *= -1;
      } else {
           if (e.x < e.radius || e.x > this.width - e.radius) e.vx *= -1;
      }

      if (e.y > this.height + e.radius) {
        this.enemies.splice(i, 1);
        continue;
      }

      const distPlayer = Math.hypot(e.x - this.player.x, e.y - this.player.y);

      let hitWingman = false;
      for (let wIdx = this.activeWingmen.length - 1; wIdx >= 0; wIdx--) {
          const w = this.activeWingmen[wIdx];
          if (Math.hypot(e.x - w.x, e.y - w.y) < e.radius + 15) {
              hitWingman = true;
              e.hp! -= 2;
              w.hp -= e.type?.endsWith('_boss') ? 5 : 2;
              this.createExplosion(w.x, w.y, 30, '#f43f5e');
              if (w.hp <= 0) {
                  this.createExplosion(w.x, w.y, 50, '#3b82f6');
                  this.activeWingmen.splice(wIdx, 1);
              }
              if (e.hp! <= 0) {
                  this.createExplosion(e.x, e.y, 40, e.color);
                  this.enemies.splice(i, 1);
              }
              break;
          }
      }
      if (hitWingman) continue;

      if (distPlayer < e.radius + 8 && this.invulnerableTimer <= 0) {
        if (this.hasShield) {
          this.hasShield = false;
          this.weaponLevel = Math.max(1, this.weaponLevel - 1);
          this.createExplosion(e.x, e.y, 40, e.color);
          if (!e.type?.endsWith('_boss')) {
              this.enemies.splice(i, 1);
          }
          this.screenShake(15);
          this.invulnerableTimer = 1000;
          if (!e.type?.endsWith('_boss')) continue;
        } else {
          this.health.update(h => h - 1);
          this.createExplosion(this.player.x, this.player.y, 40, '#f43f5e');
          this.screenShake(25);
          
          if (this.health() <= 0) {
              this.createExplosion(this.player.x, this.player.y, 100, '#ffffff');
              this.screenShake(50);
              this.triggerGameOver();
              return;
          }
          
          this.invulnerableTimer = 2000;
          this.weaponLevel = Math.max(1, this.weaponLevel - 1);
          if (!e.type?.endsWith('_boss')) {
              this.enemies.splice(i, 1);
          }
          if (!e.type?.endsWith('_boss')) continue;
        }
      }

      for (let j = this.bullets.length - 1; j >= 0; j--) {
        const b = this.bullets[j];
        const distHit = Math.hypot(e.x - b.x, e.y - b.y);
        if (distHit < e.radius + b.radius) {
          const dmg = b.damage || 1;
          if (!this.hasPierce) this.bullets.splice(j, 1);
          e.hp! -= dmg;
          this.createExplosion(b.x, b.y, 6, b.color);

          if (e.hp! <= 0) {
            this.addKillScore(10);
            this.createExplosion(e.x, e.y, 40, e.color);
            
            if (Math.random() < 0.25) { // increased drop rate slightly
              const rand = Math.random();
              let type: 'weapon' | 'bomb' | 'shield' | 'pierce' | 'freeze' | 'orbit' | 'laser' | 'health' = 'weapon';
              let color = '#3b82f6';
              // Make weapon drop much more common
              if (rand < 0.40) { type = 'weapon'; color = '#3b82f6'; }
              else if (rand < 0.50) { type = 'bomb'; color = '#ef4444'; }
              else if (rand < 0.60) { type = 'shield'; color = '#8b5cf6'; }
              else if (rand < 0.70) { type = 'pierce'; color = '#fcd34d'; }
              else if (rand < 0.75) { type = 'freeze'; color = '#38bdf8'; }
              else if (rand < 0.85) { type = 'orbit'; color = '#ec4899'; }
              else if (rand < 0.95) { type = 'laser'; color = '#22c55e'; }
              else { type = 'health'; color = '#f43f5e'; }
              
              // Fallback to weapon if we roll a redundant powerup
              if (type === 'shield' && this.hasShield) { type = 'weapon'; color = '#3b82f6'; }
              if (type === 'pierce' && this.hasPierce) { type = 'weapon'; color = '#3b82f6'; }
              if (type === 'health' && this.health() >= this.getShipStats().hp) { type = 'weapon'; color = '#3b82f6'; }

              this.powerUps.push({ x: e.x, y: e.y, vy: 2, radius: 12, color, type, pulse: 0 });
            }
            if (e.type?.endsWith('_boss')) this.screenShake(20);
            
            this.enemies.splice(i, 1);
            break;
          }
        }
      }
    }
  }

  addKillScore(baseScore: number) {
    this.score.update(s => s + Math.floor(baseScore));
    if (!this.singularityActive) {
        this.grazeEnergy.update(g => Math.min(100, g + 3));
    }
  }

  createExplosion(x: number, y: number, count: number, color: string) {
    if (this.particles.length > 300) count = Math.floor(count / 4);
    if (this.particles.length > 600) count = 1;
    
    if (count > 10 && this.gameStarted()) {
        this.playExplosionSynth(count >= 80);
    }
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 6 + 1;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: 400 + Math.random() * 400, maxLife: 800,
        color, size: Math.random() * 3 + 1, alpha: 1
      });
    }
  }

  draw() {
    this.ctx.save();
    if (this.shakeIntensity > 0.5) {
      const sx = (Math.random() - 0.5) * this.shakeIntensity;
      const sy = (Math.random() - 0.5) * this.shakeIntensity;
      this.ctx.translate(sx, sy);
    }
    
    // Draw background clearing
    let bgFill = this.gameStarted() ? 'rgba(2, 6, 23, 0.4)' : '#020617';
    
    this.ctx.fillStyle = bgFill;
    this.ctx.fillRect(0, 0, this.width, this.height);

    if (this.gameStarted()) {
        const beatVal = this.beatPulse();
        
        // Target indicator
        this.ctx.strokeStyle = `rgba(168, 85, 247, ${0.3 + beatVal * 0.3})`;
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([4, 4]);
        this.ctx.beginPath();
        this.ctx.arc(this.player.x, this.player.y, 25, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        this.ctx.globalAlpha = 1;
    }

    // Draw stars
    for (const star of this.stars) {
      this.ctx.fillStyle = star.type === 'foreground' ? `rgba(186, 230, 253, ${star.alpha})` : `rgba(125, 211, 252, ${star.alpha * 0.5})`;
      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      this.ctx.fill();
    }

    if (this.gameStarted()) {
        this.ctx.globalCompositeOperation = 'lighter';
        for (const p of this.particles) {
      this.ctx.globalAlpha = p.alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1.0;
    this.ctx.globalCompositeOperation = 'source-over';

    for (const e of this.enemies) {
      if (e.type === 'stealth') {
          this.ctx.globalAlpha = Math.max(0.1, Math.min(1, 1 - (e.hp! / (e.maxHp! + 0.1)) + 0.1));
      }
      this.ctx.fillStyle = e.color;
      this.ctx.beginPath();
      
      const rScale = 1 + this.beatPulse() * 0.2;
      const actualRadius = e.radius * rScale;
      
      if (e.type === 'fast') {
        const rot = this.lastFrameTime / 200;
        for (let i=0; i<3; i++) {
            const angle = rot + (i * Math.PI * 2) / 3;
            if (i===0) this.ctx.moveTo(e.x + Math.cos(angle)*actualRadius, e.y + Math.sin(angle)*actualRadius);
            else this.ctx.lineTo(e.x + Math.cos(angle)*actualRadius, e.y + Math.sin(angle)*actualRadius);
        }
      } else if (e.type === 'tank') {
        const numPoints = 6;
        const rot = Math.PI / 6;
        for (let i=0; i<=numPoints; i++) {
            const angle = rot + (i / numPoints) * Math.PI * 2;
            if (i===0) this.ctx.moveTo(e.x + Math.cos(angle)*actualRadius, e.y + Math.sin(angle)*actualRadius);
            else this.ctx.lineTo(e.x + Math.cos(angle)*actualRadius, e.y + Math.sin(angle)*actualRadius);
        }
      } else if (e.type === 'swarmer') {
        const rot = this.lastFrameTime / 100;
        for (let i=0; i<5; i++) {
            const angle = rot + (i * Math.PI * 2) / 5;
            const r = actualRadius * (i % 2 === 0 ? 1 : 0.4);
            if (i===0) this.ctx.moveTo(e.x + Math.cos(angle)*r, e.y + Math.sin(angle)*r);
            else this.ctx.lineTo(e.x + Math.cos(angle)*r, e.y + Math.sin(angle)*r);
        }
      } else if (e.type?.endsWith('_boss')) {
        const rot = this.lastFrameTime / 200;
        
        if (e.type === 'circle_boss') {
            this.ctx.arc(e.x, e.y, actualRadius, 0, Math.PI * 2);
        } else if (e.type === 'square_boss') {
            const numPoints = 4;
            for (let i = 0; i <= numPoints; i++) {
                const angle = rot + (i / numPoints) * Math.PI * 2;
                if (i === 0) this.ctx.moveTo(e.x + Math.cos(angle) * actualRadius, e.y + Math.sin(angle) * actualRadius);
                else this.ctx.lineTo(e.x + Math.cos(angle) * actualRadius, e.y + Math.sin(angle) * actualRadius);
            }
        } else if (e.type === 'triangle_boss') {
            const numPoints = 3;
            for (let i = 0; i <= numPoints; i++) {
                const angle = rot + (i / numPoints) * Math.PI * 2;
                if (i === 0) this.ctx.moveTo(e.x + Math.cos(angle) * actualRadius, e.y + Math.sin(angle) * actualRadius);
                else this.ctx.lineTo(e.x + Math.cos(angle) * actualRadius, e.y + Math.sin(angle) * actualRadius);
            }
        } else if (e.type === 'pentagon_boss') {
            const numPoints = 5;
            for (let i = 0; i <= numPoints; i++) {
                const angle = rot + (i / numPoints) * Math.PI * 2;
                if (i === 0) this.ctx.moveTo(e.x + Math.cos(angle) * actualRadius, e.y + Math.sin(angle) * actualRadius);
                else this.ctx.lineTo(e.x + Math.cos(angle) * actualRadius, e.y + Math.sin(angle) * actualRadius);
            }
        } else if (e.type === 'hexagon_boss') {
            const numPoints = 6;
            for (let i = 0; i <= numPoints; i++) {
                const angle = rot + (i / numPoints) * Math.PI * 2;
                if (i === 0) this.ctx.moveTo(e.x + Math.cos(angle) * actualRadius, e.y + Math.sin(angle) * actualRadius);
                else this.ctx.lineTo(e.x + Math.cos(angle) * actualRadius, e.y + Math.sin(angle) * actualRadius);
            }
        } else if (e.type === 'star_boss') {
            const numPoints = 10;
            for (let i = 0; i <= numPoints; i++) {
                const angle = rot + (i / numPoints) * Math.PI * 2;
                const r = i % 2 === 0 ? actualRadius : actualRadius * 0.4;
                if (i === 0) this.ctx.moveTo(e.x + Math.cos(angle) * r, e.y + Math.sin(angle) * r);
                else this.ctx.lineTo(e.x + Math.cos(angle) * r, e.y + Math.sin(angle) * r);
            }
        } else if (e.type === 'diamond_boss') {
            const numPoints = 4;
            for (let i = 0; i <= numPoints; i++) {
                const angle = rot * 2 + (i / numPoints) * Math.PI * 2;
                const r = i % 2 === 0 ? actualRadius : actualRadius * 0.6;
                if (i === 0) this.ctx.moveTo(e.x + Math.cos(angle) * r, e.y + Math.sin(angle) * r);
                else this.ctx.lineTo(e.x + Math.cos(angle) * r, e.y + Math.sin(angle) * r);
            }
        } else if (e.type === 'omega_boss') {
            const numPoints = 16;
            for (let i = 0; i <= numPoints; i++) {
              const angle = rot * 3 + (i / numPoints) * Math.PI * 2;
              const r = actualRadius * (0.8 + 0.2 * Math.sin(angle * 8 + this.lastFrameTime / 100));
              if (i === 0) this.ctx.moveTo(e.x + Math.cos(angle) * r, e.y + Math.sin(angle) * r);
              else this.ctx.lineTo(e.x + Math.cos(angle) * r, e.y + Math.sin(angle) * r);
            }
        } else if (e.type === 'nova_boss') {
            const numPoints = 12;
            for (let i = 0; i <= numPoints; i++) {
              const angle = rot * 2 + (i / numPoints) * Math.PI * 2;
              const r = actualRadius * (i % 2 === 0 ? 1 : 0.4);
              if (i === 0) this.ctx.moveTo(e.x + Math.cos(angle) * r, e.y + Math.sin(angle) * r);
              else this.ctx.lineTo(e.x + Math.cos(angle) * r, e.y + Math.sin(angle) * r);
            }
        } else if (e.type === 'pulsar_boss') {
            for (let i = 0; i <= 6; i++) {
              const angle = rot * 4 + (i / 6) * Math.PI * 2;
              const r = actualRadius * (0.6 + 0.4 * Math.sin(this.lastFrameTime / 50));
              if (i === 0) this.ctx.moveTo(e.x + Math.cos(angle) * r, e.y + Math.sin(angle) * r);
              else this.ctx.lineTo(e.x + Math.cos(angle) * r, e.y + Math.sin(angle) * r);
            }
        } else if (e.type === 'quasar_boss') {
            this.ctx.arc(e.x, e.y, actualRadius * (0.8 + 0.2 * Math.sin(this.lastFrameTime / 100)), 0, Math.PI * 2);
            this.ctx.moveTo(e.x + actualRadius, e.y);
            this.ctx.arc(e.x, e.y, actualRadius * 0.4, 0, Math.PI * 2);
        } else if (e.type === 'nebula_boss') {
            const numPoints = 20;
            for (let i = 0; i <= numPoints; i++) {
              const angle = rot + (i / numPoints) * Math.PI * 2;
              const r = actualRadius * (0.9 + 0.1 * Math.random());
              if (i === 0) this.ctx.moveTo(e.x + Math.cos(angle) * r, e.y + Math.sin(angle) * r);
              else this.ctx.lineTo(e.x + Math.cos(angle) * r, e.y + Math.sin(angle) * r);
            }
        } else if (e.type === 'eclipse_boss') {
            this.ctx.arc(e.x, e.y, actualRadius, 0, Math.PI * 2);
            this.ctx.fillStyle = '#000000';
            this.ctx.fill();
            this.ctx.beginPath();
            this.ctx.arc(e.x, e.y, actualRadius * 0.9, 0, Math.PI * 2);
        } else if (e.type === 'singularity_boss') {
            const r = actualRadius * (0.5 + 0.5 * Math.abs(Math.sin(this.lastFrameTime / 200)));
            this.ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
            this.ctx.moveTo(e.x + actualRadius, e.y);
            this.ctx.arc(e.x, e.y, actualRadius, 0, Math.PI * 2);
        } else if (e.type === 'void_boss') {
            this.ctx.rect(e.x - actualRadius, e.y - actualRadius, actualRadius * 2, actualRadius * 2);
            this.ctx.moveTo(e.x + actualRadius*0.5, e.y);
            this.ctx.arc(e.x, e.y, actualRadius * 0.5, 0, Math.PI * 2);
        } else if (e.type === 'genesis_boss' || e.type === 'eternal_boss') {
            const numPoints = 24;
            for (let i = 0; i <= numPoints; i++) {
              const angle = -rot * 2 + (i / numPoints) * Math.PI * 2;
              const r = actualRadius * (0.5 + 0.5 * Math.sin(angle * 6 + this.lastFrameTime / 200));
              if (i === 0) this.ctx.moveTo(e.x + Math.cos(angle) * r, e.y + Math.sin(angle) * r);
              else this.ctx.lineTo(e.x + Math.cos(angle) * r, e.y + Math.sin(angle) * r);
            }
            this.ctx.moveTo(e.x + actualRadius * 0.4, e.y);
            this.ctx.arc(e.x, e.y, actualRadius * 0.4, 0, Math.PI * 2);
        }
      } else {
        const numPoints = 8;
        for (let i = 0; i <= numPoints; i++) {
          const angle = (i / numPoints) * Math.PI * 2;
          const r = actualRadius * (0.8 + 0.2 * Math.sin(angle * 5 + this.lastFrameTime / 150));
          if (i === 0) this.ctx.moveTo(e.x + Math.cos(angle) * r, e.y + Math.sin(angle) * r);
          else this.ctx.lineTo(e.x + Math.cos(angle) * r, e.y + Math.sin(angle) * r);
        }
      }
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.globalAlpha = 1.0;
    }

    for (const p of this.powerUps) {
       this.ctx.fillStyle = p.color;
       this.ctx.shadowBlur = 10 + Math.sin(p.pulse / 100) * 5;
       this.ctx.shadowColor = p.color;
       this.ctx.beginPath();
       if (p.type === 'shield' || p.type === 'pierce' || p.type === 'orbit') {
         this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
       } else if (p.type === 'bomb' || p.type === 'freeze') {
         this.ctx.rect(p.x - p.radius, p.y - p.radius, p.radius * 2, p.radius * 2);
       } else if (p.type === 'laser') {
         this.ctx.moveTo(p.x, p.y - p.radius);
         this.ctx.lineTo(p.x + p.radius, p.y + p.radius / 2);
         this.ctx.lineTo(p.x - p.radius, p.y + p.radius / 2);
       } else {
         this.ctx.moveTo(p.x, p.y - p.radius);
         this.ctx.lineTo(p.x + p.radius, p.y + p.radius);
         this.ctx.lineTo(p.x - p.radius, p.y + p.radius);
       }
       this.ctx.closePath();
       this.ctx.fill();
       
       this.ctx.shadowBlur = 0;
       this.ctx.fillStyle = 'white';
       this.ctx.font = 'bold 14px sans-serif';
       this.ctx.textAlign = 'center';
       this.ctx.textBaseline = 'middle';
       let text = 'W';
       if (p.type === 'shield') text = 'S';
       if (p.type === 'bomb') text = 'B';
       if (p.type === 'pierce') text = 'P';
       if (p.type === 'freeze') text = 'F';
       if (p.type === 'orbit') text = 'O';
       if (p.type === 'laser') text = 'L';
       if (p.type === 'health') text = 'H';
       this.ctx.fillText(text, p.x, p.y);
    }

    for (const b of this.bullets) {
      this.ctx.fillStyle = b.color;
      this.ctx.beginPath();
      const r = b.radius * (1 + this.beatPulse() * 0.3);
      this.ctx.ellipse(b.x, b.y, r * 0.8, r * 3, Math.atan2(b.vy, b.vx) + Math.PI/2, 0, Math.PI * 2);
      this.ctx.fill();
    }
    
    for (const b of this.enemyBullets) {
      this.ctx.fillStyle = b.color;
      this.ctx.beginPath();
      const r = b.radius * (1 + this.beatPulse() * 0.3) * (b.homing ? 1.2 : 1);
      
      this.ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
      this.ctx.fill();
      
      if (b.homing) {
          this.ctx.fillStyle = '#ffffff';
          this.ctx.beginPath();
          this.ctx.arc(b.x, b.y, r * 0.4, 0, Math.PI * 2);
          this.ctx.fill();
      }
    }

    if (!this.gameOver()) {
      if (this.laserTimer > 0) {
        this.ctx.fillStyle = '#22c55e';
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = '#22c55e';
        this.ctx.globalAlpha = 0.8 + 0.2 * Math.sin(this.lastFrameTime / 50);
        this.ctx.fillRect(this.player.x - 8, 0, 16, this.player.y);
        this.ctx.globalAlpha = 1;
        this.ctx.shadowBlur = 0;
      }
      if (this.orbitTimer > 0) {
        const orbitRadius = 60;
        const o1 = { x: this.player.x + Math.cos(this.orbitAngle) * orbitRadius, y: this.player.y + Math.sin(this.orbitAngle) * orbitRadius };
        const o2 = { x: this.player.x + Math.cos(this.orbitAngle + Math.PI) * orbitRadius, y: this.player.y + Math.sin(this.orbitAngle + Math.PI) * orbitRadius };
        
        this.ctx.fillStyle = '#ec4899';
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = '#ec4899';
        this.ctx.beginPath();
        this.ctx.arc(o1.x, o1.y, 8, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(o2.x, o2.y, 8, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
      }

      if (this.hasShield) {
         this.ctx.strokeStyle = '#8b5cf6';
         this.ctx.lineWidth = 2;
         this.ctx.shadowBlur = 15;
         this.ctx.shadowColor = '#8b5cf6';
         this.ctx.beginPath();
         this.ctx.arc(this.player.x, this.player.y - 5, 28 + Math.sin(this.lastFrameTime / 150) * 3, 0, Math.PI * 2);
         this.ctx.stroke();
         this.ctx.shadowBlur = 0;
      }

      if (this.invulnerableTimer > 0) {
         if (Math.floor(this.lastFrameTime / 100) % 2 === 0) {
            this.ctx.globalAlpha = 0.5;
         }
      }

      const blockSize = 8;
      this.ctx.shadowBlur = 10 + this.beatPulse() * 10;
      
      const drawBp = (x: number, y: number, bpArr: any[], isPlayer: boolean, hp?: number, maxHp?: number) => {
          this.ctx.save();
          this.ctx.translate(x, y);
          
          this.ctx.strokeStyle = 'rgba(100, 116, 139, 0.4)';
          this.ctx.lineWidth = 4;
          this.ctx.beginPath();
          for(const bp of bpArr) {
              const px = bp.x * blockSize;
              const py = bp.y * blockSize;
              for (const neighbor of bpArr) {
                  if (neighbor.x === bp.x && neighbor.y === bp.y - 1) {
                      this.ctx.moveTo(px, py);
                      this.ctx.lineTo(px, py - blockSize);
                  }
                  if (neighbor.x === bp.x - 1 && neighbor.y === bp.y) {
                      this.ctx.moveTo(px, py);
                      this.ctx.lineTo(px - blockSize, py);
                  }
              }
          }
          this.ctx.stroke();

          for(const bp of bpArr) {
              const def = this.getPartDef(bp.partId);
              if(!def) continue;
              const px = bp.x * blockSize;
              const py = bp.y * blockSize;
              
              this.ctx.fillStyle = def.color;
              this.ctx.shadowColor = def.color;
              this.ctx.beginPath();
              
              if (def.type === 'core' || def.type === 'wingman_core') {
                  this.ctx.arc(px, py, blockSize/2 + 2, 0, Math.PI * 2);
                  this.ctx.fill();
                  this.ctx.fillStyle = '#ffffff';
                  this.ctx.beginPath();
                  this.ctx.arc(px, py, blockSize/3, 0, Math.PI * 2);
                  this.ctx.fill();
                  this.ctx.fillStyle = '#93c5fd';
                  this.ctx.beginPath();
                  this.ctx.arc(px, py, blockSize/5, 0, Math.PI * 2);
                  this.ctx.fill();
              } else if (def.type === 'hull') {
                  const hs = blockSize/2;
                  this.ctx.fillRect(px - hs, py - hs, blockSize + 0.5, blockSize + 0.5);
                  this.ctx.strokeStyle = 'rgba(255,255,255,0.2)';
                  this.ctx.lineWidth = 1;
                  this.ctx.strokeRect(px - hs, py - hs, blockSize + 0.5, blockSize + 0.5);
              } else if (def.type === 'engine') {
                  const hs = blockSize/2;
                  this.ctx.fillRect(px - hs, py - hs, blockSize + 0.5, blockSize + 0.5);
                  this.ctx.fillStyle = '#475569';
                  this.ctx.fillRect(px - 2, py + hs - 2, 4, 4); // engine nozzle
              } else if (def.type === 'weapon') {
                  const hs = blockSize/2;
                  this.ctx.fillRect(px - hs + 1, py - hs + 1, blockSize - 2, blockSize - 2);
                  this.ctx.fillStyle = '#ffffff';
                  this.ctx.fillRect(px - 1, py - hs - 2, 2, hs + 2);
              }
              
              if(def.type === 'engine' && this.gameStarted() && (!isPlayer || this.mouseDown)) {
                  this.ctx.fillStyle = '#f59e0b';
                  this.ctx.shadowColor = '#f59e0b';
                  const flameLen = 6 + Math.random() * 6 + this.beatPulse() * 4;
                  this.ctx.beginPath();
                  this.ctx.moveTo(px - 3, py + blockSize/2);
                  this.ctx.lineTo(px + 3, py + blockSize/2);
                  this.ctx.lineTo(px, py + blockSize/2 + flameLen);
                  this.ctx.closePath();
                  this.ctx.fill();
                  
                  this.ctx.fillStyle = '#fde047';
                  this.ctx.beginPath();
                  this.ctx.moveTo(px - 1, py + blockSize/2);
                  this.ctx.lineTo(px + 1, py + blockSize/2);
                  this.ctx.lineTo(px, py + blockSize/2 + flameLen * 0.6);
                  this.ctx.closePath();
                  this.ctx.fill();
              }
          }
          
          this.ctx.shadowBlur = 0;
          for(const bp of bpArr) {
              const px = bp.x * blockSize;
              const py = bp.y * blockSize;
              
              for (const neighbor of bpArr) {
                  if (neighbor.x === bp.x && neighbor.y === bp.y - 1) {
                      this.ctx.fillStyle = '#334155';
                      this.ctx.fillRect(px - 2.5, py - blockSize/2 - 2.5, 5, 5);
                      this.ctx.fillStyle = '#94a3b8';
                      this.ctx.fillRect(px - 1, py - blockSize/2 - 1, 2, 2);
                  }
                  if (neighbor.x === bp.x - 1 && neighbor.y === bp.y) {
                      this.ctx.fillStyle = '#334155';
                      this.ctx.fillRect(px - blockSize/2 - 2.5, py - 2.5, 5, 5);
                      this.ctx.fillStyle = '#94a3b8';
                      this.ctx.fillRect(px - blockSize/2 - 1, py - 1, 2, 2);
                  }
              }
          }

          if (hp !== undefined && maxHp !== undefined && hp < maxHp) {
              this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
              this.ctx.fillRect(-15, 20, 30, 4);
              this.ctx.fillStyle = '#3b82f6';
              this.ctx.fillRect(-15, 20, 30 * (Math.max(0, hp) / maxHp), 4);
          }

          this.ctx.restore();
      };

      const mainBp = this.gameStarted() ? this.playerBp : this.blueprint();
      drawBp(this.player.x, this.player.y, mainBp, true);

      if (this.gameStarted()) {
          for (const w of this.activeWingmen) {
              drawBp(w.x, w.y, w.bp, false, w.hp, w.maxHp);
          }
      }

      this.ctx.globalAlpha = 1;
      
      if (this.singularityActive) {
         const radius = 250 + Math.sin(this.lastFrameTime / 50) * 20;

         const sg = this.ctx.createRadialGradient(this.player.x, this.player.y, 10, this.player.x, this.player.y, radius);
         sg.addColorStop(0, '#000000');
         sg.addColorStop(0.1, '#9333ea');
         sg.addColorStop(0.4, 'rgba(147, 51, 234, 0.4)');
         sg.addColorStop(1, 'rgba(0, 0, 0, 0)');

         this.ctx.globalCompositeOperation = 'lighter';
         this.ctx.fillStyle = sg;
         this.ctx.beginPath();
         this.ctx.arc(this.player.x, this.player.y, radius, 0, Math.PI * 2);
         this.ctx.fill();
         this.ctx.globalCompositeOperation = 'source-over';

         this.ctx.fillStyle = '#000000';
         this.ctx.shadowBlur = 20;
         this.ctx.shadowColor = '#d946ef';
         this.ctx.beginPath();
         this.ctx.arc(this.player.x, this.player.y, 35, 0, Math.PI * 2);
         this.ctx.fill();
         this.ctx.shadowBlur = 0;

         this.ctx.strokeStyle = '#d946ef';
         this.ctx.lineWidth = 3;
         this.ctx.beginPath();
         this.ctx.ellipse(this.player.x, this.player.y, 60, 15, this.lastFrameTime / 200, 0, Math.PI * 2);
         this.ctx.stroke();

         this.ctx.strokeStyle = '#c026d3';
         this.ctx.beginPath();
         this.ctx.ellipse(this.player.x, this.player.y, 90, 20, -this.lastFrameTime / 150, 0, Math.PI * 2);
         this.ctx.stroke();
      }
    }

    if (this.gameStarted()) {
       const gradient = this.ctx.createRadialGradient(this.width/2, this.height/2, 0, this.width/2, this.height/2, this.height * 0.8);
       gradient.addColorStop(0, 'rgba(0,0,0,0)');
       gradient.addColorStop(1, 'rgba(0,0,0,0.6)');
       this.ctx.fillStyle = gradient;
       this.ctx.fillRect(0, 0, this.width, this.height);
    }
    
    // Draw Floating Texts
    for (const ft of this.floatingTexts) {
        this.ctx.save();
        const progress = ft.life / ft.maxLife; // 1 to 0
        this.ctx.globalAlpha = Math.max(0, progress);
        
        let scale = 1;
        let rotation = 0;
        
        if (ft.text === '完美！') {
            scale = 1 + Math.sin(progress * Math.PI) * 0.5; // Pops out and shrinks
            rotation = (1 - progress) * 0.2; // Slight spin
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = ft.color;
        } else if (ft.text === 'GREAT!') {
            scale = 1 + Math.sin(progress * Math.PI) * 0.2;
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = ft.color;
        } else if (ft.text === '错过') {
            rotation = -(1 - progress) * 0.5;
            scale = 0.8 + progress * 0.2;
        }
        
        this.ctx.translate(ft.x, ft.y);
        this.ctx.scale(scale, scale);
        this.ctx.rotate(rotation);
        
        this.ctx.fillStyle = ft.color;
        
        // Dynamic font size
        const fontSize = ft.text === '完美！' ? 24 : (ft.text === '错过' ? 14 : 18);
        this.ctx.font = `900 italic ${fontSize}px sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // Shadow pass
        this.ctx.fillText(ft.text, 0, 0);
        
        // White core text
        if (ft.text !== '错过') {
            this.ctx.shadowBlur = 0;
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillText(ft.text, 0, 0);
        }
        
        this.ctx.restore();
    }
    this.ctx.globalAlpha = 1;

    if (this.waveTimer > 0) {
       this.ctx.globalAlpha = Math.min(1, this.waveTimer / 1000);
       this.ctx.fillStyle = '#ffffff';
       this.ctx.font = '800 80px "Rajdhani", sans-serif';
       this.ctx.textAlign = 'center';
       this.ctx.textBaseline = 'middle';
       this.ctx.shadowBlur = 30;
       this.ctx.shadowColor = '#3b82f6';
       this.ctx.fillText(`第 ${this.wave()} 波`, this.width / 2, this.height / 3);
       this.ctx.globalAlpha = 1;
       this.ctx.shadowBlur = 0;
    }

    }
    this.ctx.restore();
  }
}
