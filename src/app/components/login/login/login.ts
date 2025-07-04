import { Component, DOCUMENT, Inject, PLATFORM_ID, ViewEncapsulation } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { isPlatformBrowser } from '@angular/common';
@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.html',
  styleUrl: './login.scss',
  encapsulation: ViewEncapsulation.None,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule
  ],

})
export class Login {
  loginForm;
  loginError: string | null = null;
  hidePassword = true;
  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    @Inject(DOCUMENT) private document: Document,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    
    this.loginForm = this.fb.group({
      email: ['', [Validators.required]],
      password: ['', Validators.required]
    });

    if (isPlatformBrowser(this.platformId)) {
      this.createCanvas();
      this.animateNeuralNet();
    }
  }


  createCanvas(): void {
    const canvas = document.createElement('canvas');
    canvas.id = 'wave-canvas';
    document.body.appendChild(canvas);
  }

  animateNeuralNet(): void {
    const canvas = document.getElementById('wave-canvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initNodes();
    });

    const nodeCount = 75;
    const maxDistance = 160;
    const neighbors = 6;
    const nodes: any[] = [];

    function initNodes() {
      nodes.length = 0;
      for (let i = 0; i < nodeCount; i++) {
        nodes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.6,
          vy: (Math.random() - 0.5) * 0.6,
          radius: 1.2 + Math.random() * 1.8,
          hue: Math.floor(Math.random() * 360)
        });
      }
    }

    initNodes();

    function draw() {
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'screen';

      for (const a of nodes) {
        const connections: any[] = [];

        for (const b of nodes) {
          if (a === b) continue;
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < maxDistance) {
            connections.push({ node: b, dist });
          }
        }

        connections.sort((a, b) => a.dist - b.dist);
        const closest = connections.slice(0, neighbors);

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);

        for (const conn of closest) {
          ctx.lineTo(conn.node.x, conn.node.y);
        }

        ctx.closePath();
        ctx.strokeStyle = `hsla(${a.hue}, 100%, 75%, 0.25)`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // nodos
      for (const node of nodes) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${node.hue}, 100%, 70%, 0.8)`;
        ctx.fill();
        node.x += node.vx;
        node.y += node.vy;

        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;
      }

      ctx.globalCompositeOperation = 'source-over';
      requestAnimationFrame(draw);
    }

    draw();
  }

  login(event:any) {
    //event.preventDefault();
    if (this.loginForm.valid) {
      const { email, password } = this.loginForm.value;
      this.authService.login(email!, password!).subscribe({
        error: err => alert(err.error.message || 'Error en el login')
      });
    }
  }
}