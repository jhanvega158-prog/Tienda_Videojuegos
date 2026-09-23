import { Parallax } from '../shared/motion.directive';
import { Icon } from '../shared/icon';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  imports: [Parallax, RouterLink, Icon],
  selector: 'app-nosotros',
  styleUrl: './nosotros.css',
  templateUrl: './nosotros.html',
})
export class Nosotros {}
