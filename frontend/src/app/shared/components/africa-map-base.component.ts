import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ThemeService } from '../../core/services/theme.service';
import * as L from 'leaflet';

@Component({
  selector: 'app-africa-map-base',
  standalone: true,
  imports: [CommonModule],
  template: `<div #mapEl class="map-container-full"></div>`,
  styles: [`:host { display: block; width: 100%; }`]
})
export class AfricaMapBaseComponent implements OnInit, AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('mapEl') mapEl!: ElementRef;
  @Input() countryData: Map<string, number> = new Map();
  @Input() maxValue: number = 5;
  @Output() countryClick = new EventEmitter<string>();
  @Output() countryHover = new EventEmitter<string>();

  map!: L.Map;
  geoLayer!: L.GeoJSON;
  private geoData: any;

  constructor(private http: HttpClient, public theme: ThemeService) {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.initMap();
    this.loadGeoJson();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['countryData'] && this.geoLayer) {
      this.updateChoropleth();
    }
  }

  ngOnDestroy(): void {
    if (this.map) this.map.remove();
  }

  private initMap(): void {
    this.map = L.map(this.mapEl.nativeElement, {
      center: [2, 20],
      zoom: 3,
      minZoom: 2,
      maxZoom: 7,
      zoomControl: true,
      attributionControl: true
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(this.map);
  }

  private loadGeoJson(): void {
    this.http.get('/assets/geo/africa.geojson').subscribe({
      next: (data: any) => {
        this.geoData = data;
        this.geoLayer = L.geoJSON(data, {
          style: (feature) => this.getStyle(feature),
          onEachFeature: (feature, layer) => {
            const code = feature.properties?.ISO_A2;
            const name = feature.properties?.NAME || code;
            layer.bindTooltip(name, { sticky: true });
            layer.on('click', () => this.countryClick.emit(code));
            layer.on('mouseover', (e: any) => {
              this.countryHover.emit(code);
              e.target.setStyle({ weight: 3, fillOpacity: 0.8 });
            });
            layer.on('mouseout', (e: any) => {
              this.geoLayer.resetStyle(e.target);
            });
          }
        }).addTo(this.map);
      },
      error: () => console.warn('Could not load Africa GeoJSON')
    });
  }

  private getStyle(feature: any): L.PathOptions {
    const code = feature?.properties?.ISO_A2;
    const value = this.countryData.get(code) ?? 0;
    return {
      fillColor: this.getColor(value),
      weight: 1,
      opacity: 1,
      color: '#666',
      fillOpacity: Math.max(0.2, Math.min(0.85, value / Math.max(this.maxValue, 1)))
    };
  }

  private getColor(value: number): string {
    if (value >= 5) return '#b71c1c';
    if (value >= 4) return '#d32f2f';
    if (value >= 3) return '#ff9800';
    if (value >= 2) return '#ffc107';
    if (value >= 1) return '#4caf50';
    return '#81c784';
  }

  updateChoropleth(): void {
    if (!this.geoLayer) return;
    this.geoLayer.eachLayer((layer: any) => {
      if (layer.feature) {
        layer.setStyle(this.getStyle(layer.feature));
      }
    });
  }

  getMap(): L.Map {
    return this.map;
  }
}
