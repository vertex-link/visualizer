// Export reusable components
export { default as ExampleContainer } from './components/ExampleContainer.vue'
export { default as InfoPanel } from './components/InfoPanel.vue'
export { default as ControlPanel } from './components/ControlPanel.vue'
export { default as ControlGroup } from './components/ControlGroup.vue'

// Export specific examples
export { default as RotatingCubesExample } from './rotating-cubes/RotatingCubesExample.vue'
export { RotatingCubesDemo } from './rotating-cubes/RotatingCubesDemo'

// Example metadata for routing and discovery
export interface ExampleMetadata {
  id: string
  title: string
  description: string
  component: any
  route: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  technologies: string[]
  features: string[]
}

export const examples: ExampleMetadata[] = [
  {
    id: 'rotating-cubes',
    title: 'Rotating Cubes',
    description: 'WebGPU rendering with Actor-Component-System architecture',
    component: () => import('./rotating-cubes/RotatingCubesExample.vue'),
    route: '/examples/rotating-cubes',
    difficulty: 'beginner',
    technologies: ['WebGPU', 'TypeScript', 'WGSL'],
    features: [
      'WebGPU Rendering',
      'Component System',
      '3D Transforms',
      'Real-time Updates'
    ]
  },
  {
    id: 'resources',
    title: 'Resource Handling',
    description: 'Resource Handling and setup',
    component: () => import('./resources/ResourcesDemo.vue'),
    route: '/examples/rotating-cubes',
    difficulty: 'beginner',
    technologies: ['WebSockets', 'TypeScript', 'ZigLang', 'Wasm'],
    features: [
      'Buffer Streaming',
      'Component System',
      'Processor System',
      'Real-time Updates'
    ]
  }
  // Add more examples here as they are created
]

// Utility to get example by ID
export function getExampleById(id: string): ExampleMetadata | undefined {
  return examples.find(example => example.id === id)
}

// Utility to get examples by difficulty
export function getExamplesByDifficulty(difficulty: ExampleMetadata['difficulty']): ExampleMetadata[] {
  return examples.filter(example => example.difficulty === difficulty)
}

// Utility to get examples by technology
export function getExamplesByTechnology(technology: string): ExampleMetadata[] {
  return examples.filter(example =>
    example.technologies.some(tech =>
      tech.toLowerCase().includes(technology.toLowerCase())
    )
  )
}
