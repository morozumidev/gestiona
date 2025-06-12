import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

import { Session } from '../../../services/session'; // Asegúrate de que esta ruta sea correcta

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    MatIconModule,
    MatFormFieldModule,
    MatCardModule,
    ReactiveFormsModule,
    MatInputModule,
    MatButtonModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);

  loginForm: FormGroup;
  hidePassword = true;
  loginError: string | null = null;

  constructor(private sessionService:Session) {
    this.loginForm = this.formBuilder.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
    });
  }

  login(): void {
    if (this.loginForm.valid) {
      const username = this.loginForm.get('username')!.value;
      const password = this.loginForm.get('password')!.value;
      const credentialKey = `${username}:${password}`;

      switch (credentialKey) {
        case 'movil:123':
          this.sessionService.setUser(username);
          this.loginError = null;
          this.router.navigate(['/new-ticket']);
          break;
           case 'web:123':
          this.sessionService.setUser(username);
          this.loginError = null;
          this.router.navigate(['/new-ticket']);
          break;
        case 'atencion:123':
          this.sessionService.setUser(username);
          this.loginError = null;
          this.router.navigate(['/tickets']);
          break;
        case 'alumbrado:123':
          this.sessionService.setUser(username);
          this.loginError = null;
          this.router.navigate(['/dashboard-alumbrado']);
          break;
         case 'cuadrilla:123':
          this.sessionService.setUser(username);
          this.loginError = null;
          this.router.navigate(['/dashboard-cuadrilla']);
          break;
        case 'admin:123':
          this.sessionService.setUser(username);
          this.loginError = null;
          this.router.navigate(['/tickets']);
          break;
        default:
          this.loginError = 'Credenciales incorrectas. Intenta de nuevo.';
      }
    } else {
      this.loginError = 'Completa todos los campos.';
    }
  }
}
