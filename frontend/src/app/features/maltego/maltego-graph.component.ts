import {
  Component, ChangeDetectionStrategy, ChangeDetectorRef,
  ElementRef, ViewChild, AfterViewInit, OnDestroy, NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { environment } from '@env';

/* ────────────────────────── Interfaces ────────────────────────── */

interface MaltegoEntity {
  id: string;
  type: string;
  value: string;
  label: string;
  properties: Record<string, string>;
  weight: number;
}

interface MaltegoLink {
  source: string;
  target: string;
  label: string;
  type: string;
  weight: number;
}

interface GraphNode {
  id: string;
  entity: MaltegoEntity;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx: number | null;
  fy: number | null;
  radius: number;
  color: string;
  glowColor: string;
  icon: string;
  pinned: boolean;
}

interface GraphLink {
  source: string;
  target: string;
  label: string;
  type: string;
  weight: number;
  color: string;
}

interface TransformResponse {
  entities: MaltegoEntity[];
  links: MaltegoLink[];
}

/* ────────────────────────── Constants ────────────────────────── */

const ENTITY_TYPES: string[] = [
  'Person', 'Email', 'Domain', 'IP', 'Phone', 'Organization',
  'SocialProfile', 'Hash', 'URL', 'Location', 'Breach',
  'Technology', 'SSLCert', 'ASN', 'Port'
];

const TYPE_COLORS: Record<string, string> = {
  Person: '#4a90d9',
  Email: '#e67e22',
  Domain: '#27ae60',
  IP: '#8e44ad',
  Phone: '#f1c40f',
  Organization: '#e74c3c',
  SocialProfile: '#00bcd4',
  Hash: '#95a5a6',
  URL: '#3498db',
  Location: '#009688',
  Breach: '#dc143c',
  Technology: '#ff7043',
  SSLCert: '#66bb6a',
  ASN: '#ab47bc',
  Port: '#78909c'
};

const LINK_COLORS: Record<string, string> = {
  owns: '#4a90d9',
  resolves: '#27ae60',
  contains: '#e67e22',
  associated: '#8e44ad',
  registered: '#e74c3c',
  uses: '#00bcd4',
  hosts: '#f1c40f',
  member: '#3498db',
  default: '#5a6b80'
};

function getTypeColor(type: string): string {
  return TYPE_COLORS[type] || '#667eea';
}

function getGlowColor(type: string): string {
  const c = getTypeColor(type);
  return c + '80';
}

function getLinkColor(type: string): string {
  return LINK_COLORS[type] || LINK_COLORS['default'];
}

function getTypeIcon(type: string): string {
  return type.charAt(0).toUpperCase();
}

/* ────────────────────────── Component ────────────────────────── */

@Component({
  selector: 'app-maltego-graph',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatIconModule, MatSelectModule,
    MatTooltipModule, MatMenuModule, MatProgressBarModule, MatSnackBarModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Control Panel -->
    <div class="maltego-container">
      <div class="control-panel">
        <div class="control-left">
          <mat-icon class="panel-logo">hub</mat-icon>
          <span class="panel-title">Maltego Graph</span>
          <span class="panel-subtitle">Entity Relationship Explorer</span>
        </div>
        <div class="control-center">
          <mat-form-field appearance="outline" class="type-field">
            <mat-label>Entity Type</mat-label>
            <mat-select [(ngModel)]="entityType">
              @for (t of entityTypes; track t) {
                <mat-option [value]="t">{{ t }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" class="value-field">
            <mat-label>Entity Value</mat-label>
            <input matInput [(ngModel)]="entityValue"
                   (keyup.enter)="runTransform()"
                   placeholder="e.g. example.com, john@mail.com">
            <mat-icon matPrefix>search</mat-icon>
          </mat-form-field>
          <button mat-raised-button color="primary" class="transform-btn"
                  (click)="runTransform()" [disabled]="loading || !entityValue.trim()">
            @if (loading) {
              <mat-icon class="spin-icon">sync</mat-icon>
            } @else {
              <mat-icon>transform</mat-icon>
            }
            Transform
          </button>
          <button mat-stroked-button class="clear-btn" (click)="clearGraph()"
                  [disabled]="nodes.length === 0">
            <mat-icon>delete_sweep</mat-icon>
            Clear
          </button>
        </div>
        <div class="control-right">
          <div class="graph-stats">
            <div class="stat-chip">
              <mat-icon>scatter_plot</mat-icon>
              <span>{{ nodes.length }} nodes</span>
            </div>
            <div class="stat-chip">
              <mat-icon>timeline</mat-icon>
              <span>{{ links.length }} links</span>
            </div>
          </div>
        </div>
      </div>

      @if (loading) {
        <mat-progress-bar mode="indeterminate" class="graph-loading"></mat-progress-bar>
      }

      <div class="graph-workspace">
        <!-- SVG Graph Area -->
        <div class="graph-area" #graphContainer
             (mousedown)="onCanvasMouseDown($event)"
             (mousemove)="onCanvasMouseMove($event)"
             (mouseup)="onCanvasMouseUp($event)"
             (mouseleave)="onCanvasMouseUp($event)"
             (wheel)="onCanvasWheel($event)"
             (contextmenu)="onContextMenu($event)">
          <svg #graphSvg class="graph-svg" [attr.width]="svgWidth" [attr.height]="svgHeight">
            <defs>
              <!-- Arrow markers -->
              <marker id="arrow-default" viewBox="0 0 10 10" refX="10" refY="5"
                      markerWidth="8" markerHeight="8" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#5a6b80" opacity="0.7"/>
              </marker>
              @for (link of links; track linkTrack(link)) {
                <marker [id]="'arrow-' + linkTrack(link)" viewBox="0 0 10 10" refX="10" refY="5"
                        markerWidth="8" markerHeight="8" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" [attr.fill]="link.color" opacity="0.7"/>
                </marker>
              }
              <!-- Glow filter -->
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur"/>
                <feMerge>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              <filter id="glow-strong" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur"/>
                <feMerge>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            <g [attr.transform]="'translate(' + panX + ',' + panY + ') scale(' + zoom + ')'">
              <!-- Links -->
              @for (link of links; track linkTrack(link)) {
                <line class="graph-link"
                      [attr.x1]="getNodeX(link.source)"
                      [attr.y1]="getNodeY(link.source)"
                      [attr.x2]="getLinkEndX(link)"
                      [attr.y2]="getLinkEndY(link)"
                      [attr.stroke]="link.color"
                      [attr.stroke-width]="Math.max(1, link.weight * 0.5)"
                      [attr.marker-end]="'url(#arrow-' + linkTrack(link) + ')'"
                      [attr.opacity]="hoveredLink === link ? 1 : 0.5"
                      (mouseenter)="hoveredLink = link"
                      (mouseleave)="hoveredLink = null"/>
                <!-- Link label on hover -->
                @if (hoveredLink === link) {
                  <text class="link-label"
                        [attr.x]="(getNodeX(link.source) + getNodeX(link.target)) / 2"
                        [attr.y]="(getNodeY(link.source) + getNodeY(link.target)) / 2 - 8"
                        text-anchor="middle"
                        [attr.fill]="link.color">
                    {{ link.label }}
                  </text>
                }
              }

              <!-- Nodes -->
              @for (node of nodes; track node.id) {
                <!-- Glow circle -->
                <circle class="node-glow"
                        [attr.cx]="node.x"
                        [attr.cy]="node.y"
                        [attr.r]="node.radius + 6"
                        [attr.fill]="node.glowColor"
                        [attr.opacity]="selectedNode?.id === node.id ? 0.6 : 0.2"
                        filter="url(#glow)"/>
                <!-- Main circle -->
                <circle class="graph-node"
                        [attr.cx]="node.x"
                        [attr.cy]="node.y"
                        [attr.r]="node.radius"
                        [attr.fill]="node.color"
                        [attr.stroke]="selectedNode?.id === node.id ? '#ffffff' : node.color"
                        [attr.stroke-width]="selectedNode?.id === node.id ? 3 : 1.5"
                        [attr.filter]="selectedNode?.id === node.id ? 'url(#glow-strong)' : 'url(#glow)'"
                        [class.selected]="selectedNode?.id === node.id"
                        [class.pinned]="node.pinned"
                        (mousedown)="onNodeMouseDown($event, node)"
                        (dblclick)="expandNode(node)"/>
                <!-- Icon text -->
                <text class="node-icon-text"
                      [attr.x]="node.x"
                      [attr.y]="node.y + 1"
                      text-anchor="middle"
                      dominant-baseline="central"
                      [attr.font-size]="node.radius * 0.9"
                      fill="#ffffff"
                      style="pointer-events: none; font-weight: 700; font-family: monospace;">
                  {{ node.icon }}
                </text>
                <!-- Label -->
                <text class="node-label"
                      [attr.x]="node.x"
                      [attr.y]="node.y + node.radius + 14"
                      text-anchor="middle"
                      fill="#b0b8c8"
                      font-size="11"
                      style="pointer-events: none;">
                  {{ truncate(node.entity.label || node.entity.value, 20) }}
                </text>
                <!-- Pin indicator -->
                @if (node.pinned) {
                  <circle [attr.cx]="node.x + node.radius * 0.7"
                          [attr.cy]="node.y - node.radius * 0.7"
                          r="4" fill="#ff9800"/>
                }
              }
            </g>
          </svg>

          <!-- Zoom controls overlay -->
          <div class="zoom-controls">
            <button mat-mini-fab (click)="zoomIn()" matTooltip="Zoom In">
              <mat-icon>add</mat-icon>
            </button>
            <button mat-mini-fab (click)="zoomOut()" matTooltip="Zoom Out">
              <mat-icon>remove</mat-icon>
            </button>
            <button mat-mini-fab (click)="resetView()" matTooltip="Reset View">
              <mat-icon>center_focus_strong</mat-icon>
            </button>
            <button mat-mini-fab (click)="toggleSimulation()" [matTooltip]="simulationRunning ? 'Pause Layout' : 'Resume Layout'">
              <mat-icon>{{ simulationRunning ? 'pause' : 'play_arrow' }}</mat-icon>
            </button>
          </div>

          <!-- Context menu -->
          @if (contextMenuVisible) {
            <div class="context-menu"
                 [style.left.px]="contextMenuX"
                 [style.top.px]="contextMenuY">
              <div class="context-item" (click)="contextExpand()">
                <mat-icon>account_tree</mat-icon>
                <span>Expand</span>
              </div>
              <div class="context-item" (click)="contextRemove()">
                <mat-icon>delete</mat-icon>
                <span>Remove</span>
              </div>
              <div class="context-item" (click)="contextCopy()">
                <mat-icon>content_copy</mat-icon>
                <span>Copy Value</span>
              </div>
              <div class="context-item" (click)="contextPin()">
                <mat-icon>push_pin</mat-icon>
                <span>{{ contextNode?.pinned ? 'Unpin' : 'Pin' }}</span>
              </div>
              <div class="context-divider"></div>
              <div class="context-item" (click)="contextSelectConnected()">
                <mat-icon>device_hub</mat-icon>
                <span>Select Connected</span>
              </div>
            </div>
          }

          <!-- Empty state -->
          @if (nodes.length === 0 && !loading) {
            <div class="empty-overlay">
              <mat-icon class="empty-icon">hub</mat-icon>
              <h3>Maltego-Style Entity Graph</h3>
              <p>Enter an entity value above and click <strong>Transform</strong> to begin exploring relationships.</p>
              <p class="hint">Double-click any node to expand it. Right-click for more options.</p>
              <div class="entity-type-legend">
                @for (t of entityTypes; track t) {
                  <div class="legend-item">
                    <span class="legend-dot" [style.background]="getColor(t)"></span>
                    <span>{{ t }}</span>
                  </div>
                }
              </div>
            </div>
          }
        </div>

        <!-- Properties Panel -->
        <div class="properties-panel" [class.open]="selectedNode !== null">
          @if (selectedNode) {
            <div class="props-header">
              <div class="props-entity-icon" [style.background]="selectedNode.color">
                {{ selectedNode.icon }}
              </div>
              <div class="props-entity-info">
                <span class="props-type">{{ selectedNode.entity.type }}</span>
                <span class="props-value">{{ selectedNode.entity.value }}</span>
              </div>
              <button mat-icon-button class="props-close" (click)="selectedNode = null; cdr.markForCheck()">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            <div class="props-section">
              <div class="props-section-title">Entity Details</div>
              <div class="props-row">
                <span class="props-key">ID</span>
                <span class="props-val">{{ selectedNode.entity.id }}</span>
              </div>
              <div class="props-row">
                <span class="props-key">Type</span>
                <span class="props-val type-badge" [style.color]="selectedNode.color">{{ selectedNode.entity.type }}</span>
              </div>
              <div class="props-row">
                <span class="props-key">Value</span>
                <span class="props-val">{{ selectedNode.entity.value }}</span>
              </div>
              <div class="props-row">
                <span class="props-key">Label</span>
                <span class="props-val">{{ selectedNode.entity.label }}</span>
              </div>
              <div class="props-row">
                <span class="props-key">Weight</span>
                <span class="props-val">{{ selectedNode.entity.weight }}</span>
              </div>
            </div>
            @if (getPropertyKeys(selectedNode).length > 0) {
              <div class="props-section">
                <div class="props-section-title">Properties</div>
                @for (key of getPropertyKeys(selectedNode); track key) {
                  <div class="props-row">
                    <span class="props-key">{{ key }}</span>
                    <span class="props-val">{{ selectedNode.entity.properties[key] }}</span>
                  </div>
                }
              </div>
            }
            <div class="props-section">
              <div class="props-section-title">Connected Entities ({{ getConnectedNodes(selectedNode).length }})</div>
              @for (cn of getConnectedNodes(selectedNode); track cn.id) {
                <div class="connected-node" (click)="selectNode(cn)">
                  <span class="cn-dot" [style.background]="cn.color"></span>
                  <span class="cn-type">{{ cn.entity.type }}</span>
                  <span class="cn-value">{{ truncate(cn.entity.value, 24) }}</span>
                </div>
              }
            </div>
            <div class="props-actions">
              <button mat-raised-button color="primary" (click)="expandNode(selectedNode)" [disabled]="loading">
                <mat-icon>account_tree</mat-icon>
                Expand Node
              </button>
              <button mat-stroked-button (click)="removeNode(selectedNode)">
                <mat-icon>delete</mat-icon>
                Remove
              </button>
            </div>
          } @else {
            <div class="props-empty">
              <mat-icon>touch_app</mat-icon>
              <p>Click a node to view its properties</p>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: calc(100vh - 64px); overflow: hidden; }

    .maltego-container {
      display: flex; flex-direction: column;
      height: 100%; background: #0a0e17;
    }

    /* ─── Control Panel ─── */
    .control-panel {
      display: flex; align-items: center; gap: 12px;
      padding: 8px 16px;
      background: linear-gradient(90deg, #0d1117, #161b22);
      border-bottom: 1px solid rgba(102, 126, 234, 0.15);
      z-index: 10; flex-shrink: 0;
    }
    .control-left {
      display: flex; align-items: center; gap: 8px; flex-shrink: 0;
    }
    .panel-logo { color: #667eea; font-size: 28px; width: 28px; height: 28px; }
    .panel-title { font-size: 16px; font-weight: 700; color: #e0e6f0; letter-spacing: 0.5px; }
    .panel-subtitle { font-size: 10px; color: #5a6b80; letter-spacing: 1px; text-transform: uppercase; }

    .control-center {
      display: flex; align-items: center; gap: 8px; flex: 1; justify-content: center;
    }
    .type-field { width: 160px; }
    .type-field ::ng-deep .mat-mdc-form-field-subscript-wrapper { display: none; }
    .value-field { width: 280px; }
    .value-field ::ng-deep .mat-mdc-form-field-subscript-wrapper { display: none; }

    .transform-btn {
      height: 42px; font-weight: 600; font-size: 13px;
      display: flex; align-items: center; gap: 6px;
    }
    .clear-btn {
      height: 42px; font-size: 13px; color: #8892a4 !important;
      border-color: rgba(255,255,255,0.12) !important;
      display: flex; align-items: center; gap: 4px;
    }

    .control-right { flex-shrink: 0; }
    .graph-stats { display: flex; gap: 12px; }
    .stat-chip {
      display: flex; align-items: center; gap: 4px;
      font-size: 12px; color: #8892a4; font-weight: 500;
      padding: 4px 10px; border-radius: 12px;
      background: rgba(102, 126, 234, 0.08);
      border: 1px solid rgba(102, 126, 234, 0.12);
    }
    .stat-chip mat-icon { font-size: 16px; width: 16px; height: 16px; color: #667eea; }

    .graph-loading { flex-shrink: 0; }

    .spin-icon { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ─── Graph Workspace ─── */
    .graph-workspace {
      display: flex; flex: 1; overflow: hidden; position: relative;
    }

    /* ─── SVG Graph Area ─── */
    .graph-area {
      flex: 1; position: relative; overflow: hidden;
      background:
        radial-gradient(ellipse at center, rgba(102, 126, 234, 0.03) 0%, transparent 70%),
        linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px);
      background-size: 100% 100%, 40px 40px, 40px 40px;
      cursor: grab;
    }
    .graph-area:active { cursor: grabbing; }

    .graph-svg { display: block; width: 100%; height: 100%; }

    .graph-link {
      stroke-linecap: round;
      transition: opacity 0.15s;
      cursor: pointer;
    }
    .graph-link:hover { opacity: 1 !important; }

    .link-label {
      font-size: 10px; font-weight: 600;
      pointer-events: none;
      text-shadow: 0 0 4px #0a0e17, 0 0 8px #0a0e17;
    }

    .graph-node {
      cursor: pointer;
      transition: stroke-width 0.15s;
    }
    .graph-node:hover { stroke-width: 3px; stroke: #ffffff; }
    .graph-node.selected { stroke: #ffffff; stroke-width: 3px; }
    .graph-node.pinned { stroke-dasharray: 4 2; }

    .node-glow { pointer-events: none; }
    .node-icon-text { pointer-events: none; }
    .node-label { pointer-events: none; }

    /* ─── Zoom Controls ─── */
    .zoom-controls {
      position: absolute; bottom: 20px; left: 20px;
      display: flex; flex-direction: column; gap: 8px; z-index: 5;
    }
    .zoom-controls button {
      background: #1a1f2e !important; color: #667eea !important;
      border: 1px solid rgba(102, 126, 234, 0.2);
      width: 36px; height: 36px;
    }
    .zoom-controls button:hover {
      background: #252b3d !important;
      border-color: #667eea;
    }
    .zoom-controls ::ng-deep .mat-mdc-mini-fab .mat-icon {
      font-size: 20px; width: 20px; height: 20px;
    }

    /* ─── Context Menu ─── */
    .context-menu {
      position: absolute; z-index: 100;
      background: #1a1f2e; border: 1px solid rgba(102, 126, 234, 0.2);
      border-radius: 8px; padding: 4px 0; min-width: 180px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    }
    .context-item {
      display: flex; align-items: center; gap: 10px;
      padding: 8px 16px; cursor: pointer; color: #b0b8c8;
      font-size: 13px; transition: background 0.1s;
    }
    .context-item:hover { background: rgba(102, 126, 234, 0.1); color: #e0e6f0; }
    .context-item mat-icon { font-size: 18px; width: 18px; height: 18px; color: #667eea; }
    .context-divider {
      height: 1px; margin: 4px 8px;
      background: rgba(102, 126, 234, 0.1);
    }

    /* ─── Empty State ─── */
    .empty-overlay {
      position: absolute; top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      text-align: center; color: #5a6b80;
      pointer-events: none;
    }
    .empty-icon { font-size: 80px; width: 80px; height: 80px; color: rgba(102, 126, 234, 0.2); }
    .empty-overlay h3 { font-size: 22px; color: #8892a4; margin: 12px 0 8px; }
    .empty-overlay p { font-size: 14px; max-width: 420px; line-height: 1.5; }
    .empty-overlay .hint { font-size: 12px; color: #4a5568; margin-top: 4px; }

    .entity-type-legend {
      display: flex; flex-wrap: wrap; gap: 8px 14px;
      justify-content: center; margin-top: 24px; max-width: 500px;
    }
    .legend-item {
      display: flex; align-items: center; gap: 5px; font-size: 11px; color: #8892a4;
    }
    .legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }

    /* ─── Properties Panel ─── */
    .properties-panel {
      width: 0; overflow: hidden; flex-shrink: 0;
      background: #111827; border-left: 1px solid rgba(102, 126, 234, 0.1);
      transition: width 0.25s ease;
      display: flex; flex-direction: column;
    }
    .properties-panel.open {
      width: 320px; overflow-y: auto;
    }

    .props-header {
      display: flex; align-items: center; gap: 12px;
      padding: 16px; border-bottom: 1px solid rgba(102, 126, 234, 0.1);
      flex-shrink: 0;
    }
    .props-entity-icon {
      width: 44px; height: 44px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 20px; font-weight: 700; color: #fff;
      font-family: monospace; flex-shrink: 0;
    }
    .props-entity-info { flex: 1; min-width: 0; }
    .props-type {
      display: block; font-size: 10px; text-transform: uppercase;
      letter-spacing: 1.5px; color: #667eea; font-weight: 700;
    }
    .props-value {
      display: block; font-size: 14px; font-weight: 600;
      color: #e0e6f0; word-break: break-all;
    }
    .props-close { flex-shrink: 0; color: #5a6b80 !important; }

    .props-section {
      padding: 12px 16px; border-bottom: 1px solid rgba(102, 126, 234, 0.06);
    }
    .props-section-title {
      font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px;
      color: #667eea; font-weight: 700; margin-bottom: 8px;
    }
    .props-row {
      display: flex; justify-content: space-between; align-items: flex-start;
      padding: 5px 0; gap: 8px;
    }
    .props-key { font-size: 12px; color: #5a6b80; flex-shrink: 0; min-width: 60px; }
    .props-val {
      font-size: 12px; color: #b0b8c8; text-align: right;
      word-break: break-all; font-weight: 500;
    }
    .type-badge { font-weight: 700 !important; }

    .connected-node {
      display: flex; align-items: center; gap: 8px;
      padding: 6px 8px; border-radius: 6px; cursor: pointer;
      transition: background 0.1s; margin-bottom: 2px;
    }
    .connected-node:hover { background: rgba(102, 126, 234, 0.08); }
    .cn-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .cn-type {
      font-size: 10px; text-transform: uppercase; color: #667eea;
      font-weight: 700; letter-spacing: 0.5px; flex-shrink: 0;
    }
    .cn-value { font-size: 12px; color: #b0b8c8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .props-actions {
      padding: 16px; display: flex; flex-direction: column; gap: 8px;
      flex-shrink: 0;
    }
    .props-actions button {
      width: 100%; font-size: 13px; display: flex; align-items: center;
      justify-content: center; gap: 6px;
    }

    .props-empty {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; height: 100%; color: #4a5568;
      padding: 20px; text-align: center;
    }
    .props-empty mat-icon { font-size: 48px; width: 48px; height: 48px; margin-bottom: 12px; opacity: 0.3; }
    .props-empty p { font-size: 13px; }

    @media (max-width: 1200px) {
      .control-panel { flex-wrap: wrap; }
      .control-left { display: none; }
      .properties-panel.open { width: 260px; }
    }
    @media (max-width: 800px) {
      .properties-panel.open { width: 0; }
      .control-center { flex-wrap: wrap; }
      .type-field { width: 120px; }
      .value-field { width: 200px; }
    }
  `]
})
export class MaltegoGraphComponent implements AfterViewInit, OnDestroy {
  @ViewChild('graphSvg') graphSvgRef!: ElementRef<SVGSVGElement>;
  @ViewChild('graphContainer') graphContainerRef!: ElementRef<HTMLDivElement>;

  /* Expose Math to template */
  Math = Math;

  /* Form controls */
  entityTypes = ENTITY_TYPES;
  entityType = 'Domain';
  entityValue = '';

  /* Graph state */
  nodes: GraphNode[] = [];
  links: GraphLink[] = [];
  selectedNode: GraphNode | null = null;
  hoveredLink: GraphLink | null = null;

  /* Transform state */
  loading = false;

  /* SVG dimensions */
  svgWidth = 1200;
  svgHeight = 800;

  /* Pan / Zoom */
  panX = 0;
  panY = 0;
  zoom = 1;
  private isPanning = false;
  private panStartX = 0;
  private panStartY = 0;
  private panOriginX = 0;
  private panOriginY = 0;

  /* Node drag */
  private draggingNode: GraphNode | null = null;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragNodeStartX = 0;
  private dragNodeStartY = 0;
  private hasDragged = false;

  /* Context menu */
  contextMenuVisible = false;
  contextMenuX = 0;
  contextMenuY = 0;
  contextNode: GraphNode | null = null;

  /* Simulation */
  simulationRunning = true;
  private animFrameId: number | null = null;
  private readonly SPRING_LENGTH = 150;
  private readonly SPRING_STRENGTH = 0.005;
  private readonly REPULSION = 8000;
  private readonly DAMPING = 0.85;
  private readonly CENTER_GRAVITY = 0.01;

  private readonly apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar,
    public cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngAfterViewInit(): void {
    this.updateSvgSize();
    this.ngZone.runOutsideAngular(() => {
      this.startSimulation();
    });
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.onResize);
      window.addEventListener('click', this.onWindowClick);
    }
  }

  ngOnDestroy(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.onResize);
      window.removeEventListener('click', this.onWindowClick);
    }
  }

  private onResize = (): void => {
    this.updateSvgSize();
  };

  private onWindowClick = (): void => {
    if (this.contextMenuVisible) {
      this.contextMenuVisible = false;
      this.cdr.markForCheck();
    }
  };

  private updateSvgSize(): void {
    if (this.graphContainerRef) {
      const el = this.graphContainerRef.nativeElement;
      this.svgWidth = el.clientWidth || 1200;
      this.svgHeight = el.clientHeight || 800;
      this.cdr.markForCheck();
    }
  }

  /* ─── API Call ─── */
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('ausentinel_token') || '';
    return new HttpHeaders({ Authorization: 'Bearer ' + token });
  }

  runTransform(): void {
    if (!this.entityValue.trim()) return;

    this.loading = true;
    this.cdr.markForCheck();

    const body = {
      entityType: this.entityType,
      entityValue: this.entityValue.trim(),
      transformType: 'default'
    };

    this.http.post<TransformResponse>(
      `${this.apiUrl}/osint/maltego/transform`,
      body,
      { headers: this.getHeaders() }
    ).subscribe({
      next: (resp) => {
        this.mergeResults(resp, null);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        const msg = err.error?.message || err.error?.error || 'Transform failed';
        this.snackBar.open(msg, 'OK', { duration: 5000 });
        this.cdr.markForCheck();
      }
    });
  }

  expandNode(node: GraphNode): void {
    this.loading = true;
    this.selectedNode = node;
    this.cdr.markForCheck();

    const body = {
      entityType: node.entity.type,
      entityValue: node.entity.value,
      transformType: 'default'
    };

    this.http.post<TransformResponse>(
      `${this.apiUrl}/osint/maltego/transform`,
      body,
      { headers: this.getHeaders() }
    ).subscribe({
      next: (resp) => {
        this.mergeResults(resp, node);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        const msg = err.error?.message || err.error?.error || 'Transform failed';
        this.snackBar.open(msg, 'OK', { duration: 5000 });
        this.cdr.markForCheck();
      }
    });
  }

  private mergeResults(resp: TransformResponse, sourceNode: GraphNode | null): void {
    const centerX = this.svgWidth / 2;
    const centerY = this.svgHeight / 2;

    for (const entity of resp.entities) {
      if (this.nodes.find(n => n.id === entity.id)) continue;
      const angle = Math.random() * Math.PI * 2;
      const dist = 80 + Math.random() * 120;
      const baseX = sourceNode ? sourceNode.x : centerX;
      const baseY = sourceNode ? sourceNode.y : centerY;
      const node: GraphNode = {
        id: entity.id,
        entity,
        x: baseX + Math.cos(angle) * dist,
        y: baseY + Math.sin(angle) * dist,
        vx: 0,
        vy: 0,
        fx: null,
        fy: null,
        radius: Math.max(16, Math.min(32, 14 + entity.weight * 2)),
        color: getTypeColor(entity.type),
        glowColor: getGlowColor(entity.type),
        icon: getTypeIcon(entity.type),
        pinned: false
      };
      this.nodes.push(node);
    }

    for (const link of resp.links) {
      const exists = this.links.find(
        l => l.source === link.source && l.target === link.target
      );
      if (exists) continue;
      const srcNode = this.nodes.find(n => n.id === link.source);
      const tgtNode = this.nodes.find(n => n.id === link.target);
      if (!srcNode || !tgtNode) continue;
      this.links.push({
        source: link.source,
        target: link.target,
        label: link.label,
        type: link.type,
        weight: link.weight,
        color: getLinkColor(link.type)
      });
    }

    if (!this.simulationRunning) {
      this.simulationRunning = true;
      this.ngZone.runOutsideAngular(() => this.startSimulation());
    }
  }

  clearGraph(): void {
    this.nodes = [];
    this.links = [];
    this.selectedNode = null;
    this.hoveredLink = null;
    this.contextMenuVisible = false;
    this.cdr.markForCheck();
  }

  /* ─── Force Simulation ─── */
  private startSimulation(): void {
    const tick = (): void => {
      if (!this.simulationRunning) return;
      this.simulateTick();
      this.ngZone.run(() => this.cdr.markForCheck());
      this.animFrameId = requestAnimationFrame(tick);
    };
    this.animFrameId = requestAnimationFrame(tick);
  }

  private simulateTick(): void {
    const nodes = this.nodes;
    const links = this.links;
    if (nodes.length === 0) return;

    const cx = this.svgWidth / 2;
    const cy = this.svgHeight / 2;

    // Repulsion between all node pairs
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 1) { dist = 1; dx = Math.random() - 0.5; dy = Math.random() - 0.5; }
        const force = this.REPULSION / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx -= fx;
        a.vy -= fy;
        b.vx += fx;
        b.vy += fy;
      }
    }

    // Spring forces along links
    for (const link of links) {
      const src = nodes.find(n => n.id === link.source);
      const tgt = nodes.find(n => n.id === link.target);
      if (!src || !tgt) continue;
      const dx = tgt.x - src.x;
      const dy = tgt.y - src.y;
      let dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1) dist = 1;
      const displacement = dist - this.SPRING_LENGTH;
      const force = displacement * this.SPRING_STRENGTH;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      src.vx += fx;
      src.vy += fy;
      tgt.vx -= fx;
      tgt.vy -= fy;
    }

    // Center gravity
    for (const node of nodes) {
      node.vx += (cx - node.x) * this.CENTER_GRAVITY;
      node.vy += (cy - node.y) * this.CENTER_GRAVITY;
    }

    // Apply velocities and damping
    for (const node of nodes) {
      if (node.pinned || node.fx !== null) {
        if (node.fx !== null) { node.x = node.fx; node.y = node.fy!; }
        node.vx = 0;
        node.vy = 0;
        continue;
      }
      node.vx *= this.DAMPING;
      node.vy *= this.DAMPING;
      // Cap velocity
      const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
      if (speed > 10) {
        node.vx = (node.vx / speed) * 10;
        node.vy = (node.vy / speed) * 10;
      }
      node.x += node.vx;
      node.y += node.vy;
    }
  }

  toggleSimulation(): void {
    this.simulationRunning = !this.simulationRunning;
    if (this.simulationRunning) {
      this.ngZone.runOutsideAngular(() => this.startSimulation());
    }
    this.cdr.markForCheck();
  }

  /* ─── Node helpers for template ─── */
  getNodeX(id: string): number {
    const n = this.nodes.find(nd => nd.id === id);
    return n ? n.x : 0;
  }

  getNodeY(id: string): number {
    const n = this.nodes.find(nd => nd.id === id);
    return n ? n.y : 0;
  }

  getLinkEndX(link: GraphLink): number {
    const src = this.nodes.find(n => n.id === link.source);
    const tgt = this.nodes.find(n => n.id === link.target);
    if (!src || !tgt) return 0;
    const dx = tgt.x - src.x;
    const dy = tgt.y - src.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) return tgt.x;
    return tgt.x - (dx / dist) * tgt.radius;
  }

  getLinkEndY(link: GraphLink): number {
    const src = this.nodes.find(n => n.id === link.source);
    const tgt = this.nodes.find(n => n.id === link.target);
    if (!src || !tgt) return 0;
    const dx = tgt.x - src.x;
    const dy = tgt.y - src.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) return tgt.y;
    return tgt.y - (dy / dist) * tgt.radius;
  }

  linkTrack(link: GraphLink): string {
    return link.source + '-' + link.target;
  }

  truncate(str: string, max: number): string {
    if (!str) return '';
    return str.length > max ? str.substring(0, max) + '...' : str;
  }

  getColor(type: string): string {
    return getTypeColor(type);
  }

  getPropertyKeys(node: GraphNode): string[] {
    if (!node.entity.properties) return [];
    return Object.keys(node.entity.properties);
  }

  getConnectedNodes(node: GraphNode): GraphNode[] {
    const ids = new Set<string>();
    for (const link of this.links) {
      if (link.source === node.id) ids.add(link.target);
      if (link.target === node.id) ids.add(link.source);
    }
    return this.nodes.filter(n => ids.has(n.id));
  }

  selectNode(node: GraphNode): void {
    this.selectedNode = node;
    this.cdr.markForCheck();
  }

  /* ─── Mouse Events ─── */
  onNodeMouseDown(event: MouseEvent, node: GraphNode): void {
    event.stopPropagation();
    event.preventDefault();
    this.draggingNode = node;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.dragNodeStartX = node.x;
    this.dragNodeStartY = node.y;
    this.hasDragged = false;
    node.fx = node.x;
    node.fy = node.y;
  }

  onCanvasMouseDown(event: MouseEvent): void {
    if (event.button === 2) return; // right click handled by context menu
    if (this.draggingNode) return;
    this.contextMenuVisible = false;
    this.isPanning = true;
    this.panStartX = event.clientX;
    this.panStartY = event.clientY;
    this.panOriginX = this.panX;
    this.panOriginY = this.panY;
  }

  onCanvasMouseMove(event: MouseEvent): void {
    if (this.draggingNode) {
      const dx = (event.clientX - this.dragStartX) / this.zoom;
      const dy = (event.clientY - this.dragStartY) / this.zoom;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) this.hasDragged = true;
      this.draggingNode.x = this.dragNodeStartX + dx;
      this.draggingNode.y = this.dragNodeStartY + dy;
      this.draggingNode.fx = this.draggingNode.x;
      this.draggingNode.fy = this.draggingNode.y;
      this.cdr.markForCheck();
      return;
    }
    if (this.isPanning) {
      this.panX = this.panOriginX + (event.clientX - this.panStartX);
      this.panY = this.panOriginY + (event.clientY - this.panStartY);
      this.cdr.markForCheck();
    }
  }

  onCanvasMouseUp(event: MouseEvent): void {
    if (this.draggingNode) {
      if (!this.hasDragged) {
        // It was a click, not a drag - select the node
        this.selectedNode = this.draggingNode;
      }
      if (!this.draggingNode.pinned) {
        this.draggingNode.fx = null;
        this.draggingNode.fy = null;
      }
      this.draggingNode = null;
      this.cdr.markForCheck();
      return;
    }
    this.isPanning = false;
  }

  onCanvasWheel(event: WheelEvent): void {
    event.preventDefault();
    const delta = event.deltaY > 0 ? 0.92 : 1.08;
    const newZoom = Math.max(0.15, Math.min(5, this.zoom * delta));

    // Zoom toward mouse cursor
    const rect = this.graphContainerRef.nativeElement.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    this.panX = mouseX - (mouseX - this.panX) * (newZoom / this.zoom);
    this.panY = mouseY - (mouseY - this.panY) * (newZoom / this.zoom);
    this.zoom = newZoom;
    this.cdr.markForCheck();
  }

  onContextMenu(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    // Find if clicking on a node
    const rect = this.graphContainerRef.nativeElement.getBoundingClientRect();
    const mx = (event.clientX - rect.left - this.panX) / this.zoom;
    const my = (event.clientY - rect.top - this.panY) / this.zoom;

    let found: GraphNode | null = null;
    for (const node of this.nodes) {
      const dx = mx - node.x;
      const dy = my - node.y;
      if (Math.sqrt(dx * dx + dy * dy) <= node.radius + 5) {
        found = node;
        break;
      }
    }

    if (found) {
      this.contextNode = found;
      this.selectedNode = found;
      this.contextMenuX = event.clientX - rect.left;
      this.contextMenuY = event.clientY - rect.top;
      this.contextMenuVisible = true;
      this.cdr.markForCheck();
    } else {
      this.contextMenuVisible = false;
      this.cdr.markForCheck();
    }
  }

  /* ─── Context Menu Actions ─── */
  contextExpand(): void {
    this.contextMenuVisible = false;
    if (this.contextNode) this.expandNode(this.contextNode);
  }

  contextRemove(): void {
    this.contextMenuVisible = false;
    if (this.contextNode) this.removeNode(this.contextNode);
  }

  contextCopy(): void {
    this.contextMenuVisible = false;
    if (this.contextNode) {
      navigator.clipboard.writeText(this.contextNode.entity.value).then(() => {
        this.snackBar.open('Value copied to clipboard', 'OK', { duration: 2000 });
      });
    }
  }

  contextPin(): void {
    this.contextMenuVisible = false;
    if (this.contextNode) {
      this.contextNode.pinned = !this.contextNode.pinned;
      if (this.contextNode.pinned) {
        this.contextNode.fx = this.contextNode.x;
        this.contextNode.fy = this.contextNode.y;
      } else {
        this.contextNode.fx = null;
        this.contextNode.fy = null;
      }
      this.cdr.markForCheck();
    }
  }

  contextSelectConnected(): void {
    this.contextMenuVisible = false;
    if (this.contextNode) {
      this.selectedNode = this.contextNode;
      this.cdr.markForCheck();
    }
  }

  removeNode(node: GraphNode): void {
    this.nodes = this.nodes.filter(n => n.id !== node.id);
    this.links = this.links.filter(l => l.source !== node.id && l.target !== node.id);
    if (this.selectedNode?.id === node.id) this.selectedNode = null;
    this.cdr.markForCheck();
  }

  /* ─── Zoom Controls ─── */
  zoomIn(): void {
    this.zoom = Math.min(5, this.zoom * 1.25);
    this.cdr.markForCheck();
  }

  zoomOut(): void {
    this.zoom = Math.max(0.15, this.zoom * 0.8);
    this.cdr.markForCheck();
  }

  resetView(): void {
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
    this.cdr.markForCheck();
  }
}
