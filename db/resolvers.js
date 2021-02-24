const Usuario = require('../models/Usuario')
const Proyecto = require('../models/Proyecto')
const bcryptjs = require('bcryptjs')
const jwt = require('jsonwebtoken')
const Tarea = require('../models/Tarea')
require('dotenv').config({ path: 'variables.env' })

// Crea y firma un JWT
const crearToken = ( usuario, secreta, expiresIn ) => {
  //console.log(usuario)
  const { id, email, nombre } = usuario
  
  return jwt.sign({ id, email, nombre }, secreta, {expiresIn})
}

const resolvers = {
  Query: {
    
    obtenerProyectos: async (_, {}, ctx) => {
        const proyectos = await Proyecto.find({ creador: ctx.usuario.id })
         
        return proyectos
    },
    
    obtenerTareas: async (_, { input }, ctx) => {
        const tareas = await Tarea.find({ creador: ctx.usuario.id })
                                  .where('proyecto').equals(input.proyecto)
        return tareas
    }
    
  },
  Mutation: {
    
    // nombre: (root, args, context, info)
    crearUsuario: async ( _, { input } ) => {
      
        const { email, password } = input
        const existeUsuario = await Usuario.findOne({ email })
        
        if( existeUsuario ) {
          throw new Error('El usuario ya existe')
        }
        
        try {
            // Hash password
            const salt = await bcryptjs.genSalt(10)
            input.password = await bcryptjs.hash(password, salt)
             
            // Registrar usuario
            const nuevoUsuario = new Usuario(input)
            
            nuevoUsuario.save()
            return 'Usuario Creado Correctamente'
            
        } catch (error) {
            console.log(error)
        }
    },
    
    autenticarUsuario: async ( _, { input } ) => {
      
        const { email, password } = input
        
        // Existe el usuario
        const existeUsuario = await Usuario.findOne({ email })
        if( !existeUsuario ) {
          throw new Error('El usuario no existe')
        }
        
        // Si el password es correcto
        const passwordCorrecto = await bcryptjs.compare(password, existeUsuario.password)
        if( !passwordCorrecto ) { 
          throw new Error('Password incorrecto')
        }
        
        // Dar acceso a la app
        return {
          token: crearToken(existeUsuario, process.env.SECRETA, '4hr')
        }
    },
    
    nuevoProyecto: async ( _, { input }, ctx ) => {
      
        try {
            const proyecto = new Proyecto(input)
            // asociar el creador
            proyecto.creador = ctx.usuario.id
            // almacenar en BD
            const resultado = await proyecto.save()
            return resultado
            
        } catch (error) {
            console.log(error)
        }
    },
    
    actualizarProyecto: async( _, { id, input }, ctx ) => {
      
        // Revisar que el proyecto existe
        let proyecto = await Proyecto.findById(id)
        if( !proyecto ) {
          throw new Error('Proyecto no encontrado')
        }
        
        // Revisar si el usuario que edita es el creador
        if( proyecto.creador.toString() !== ctx.usuario.id ) {
          throw new Error('No tienes permisos para editar el proyecto')
        }
        
        // Guardar el proyecto con el nuevo nombre del input 
        proyecto = await Proyecto.findOneAndUpdate({ _id: id }, input, { new: true })
        return proyecto
    },
    
    eliminarProyecto: async (_, { id }, ctx) => {
      
        // Revisar que el proyecto existe
        let proyecto = await Proyecto.findById(id)
        if( !proyecto ) {
          throw new Error('Proyecto no encontrado')
        }
        
        // Revisar si el usuario que edita es el creador
        if( proyecto.creador.toString() !== ctx.usuario.id ) {
          throw new Error('No tienes permisos para eliminar el proyecto')
        }
        
        // Eliminar
        await Proyecto.findOneAndDelete({ _id: id })
        
        return 'Proyecto eliminado'
    },
    
    nuevaTarea: async (_, { input }, ctx) => {
      try {
          const tarea = new Tarea(input)
          tarea.creador = ctx.usuario.id
          const resultado = await tarea.save()
          return resultado
      } catch (error) {
          console.log(error)
      }
    },
    
    actualizarTarea: async (_, { id, input, estado }, ctx) => {
      
        // existe
        let tarea = await Tarea.findById( id )
        if( !tarea ) {
          throw new Error('Tarea no encontrada')
        }
        
        // propietario tarea
        if( tarea.creador.toString() !== ctx.usuario.id ) {
          throw new Error('No tienes permisos para editar la tarea')
        }
        // asignar estado
        input.estado = estado
        // guardar y retornar
        tarea = await Tarea.findOneAndUpdate({ _id: id }, input, { new: true })
        return tarea 
    },
    
    eliminarTarea: async (_, { id }, ctx) => {
      
      // Revisar que la existe
      let tarea = await Tarea.findById( id )
      if( !tarea ) {
        throw new Error('Tarea no encontrada')
      }
      
      // Revisar si el usuario que edita es el creador
      if( tarea.creador.toString() !== ctx.usuario.id ) {
        throw new Error('No tienes permisos para eliminar la tarea')
      }
      
      // Eliminar
      await Tarea.findOneAndDelete({ _id: id })
      
      return 'Tarea eliminada'
  },
  }
}

module.exports = resolvers