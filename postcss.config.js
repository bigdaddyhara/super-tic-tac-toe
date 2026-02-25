const isProduction = process.env.NODE_ENV === 'production'

module.exports = {
  plugins: [
    require('postcss-nesting')(),
    require('autoprefixer')(),
    ...(isProduction ? [require('cssnano')({ preset: 'default' })] : []),
  ],
}
