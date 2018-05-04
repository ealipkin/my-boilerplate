const gulp = require('gulp'),
  plumber = require('gulp-plumber'),
  gutil = require('gulp-util'),
  minimist = require('minimist'),
  pug = require('gulp-pug'),
  concat = require('gulp-concat'),
  postcss = require('gulp-postcss'),
  sourcemaps = require('gulp-sourcemaps'),
  browserSync = require('browser-sync').create(),
  imagemin = require('gulp-imagemin'),
  svgstore = require('gulp-svgstore'),
  svgmin = require('gulp-svgmin'),
  gulpif = require('gulp-if'),
  changed = require('gulp-changed'),
  runSequence = require('run-sequence'),
  rename = require("gulp-rename"),
  sass = require('gulp-sass'),
  inject = require('gulp-inject'),
  babel = require('gulp-babel'),
  cleanCSS = require('gulp-clean-css'),
  apply = require('postcss-apply'),
  uglify = require('gulp-uglify'),
  pump = require('pump'),
  bust = require('gulp-buster'),
  argv = minimist(process.argv.slice(2)),
  blocksFolder = 'src/blocks',
  tplFolder = 'templates',
  path = require('path'),
  fs = require('fs'),
  projectName = 'Project Name';

let pageName = 'index';
let isProd = false;

//Таск работает долго из-за оптимизации изображений, для быстрой сборки использовать static
gulp.task('prod', function() {
  isProd = true;
  runSequence('images-copy', 'fonts', 'css', 'css-minify', 'js', 'js-uglify', 'buster', 'pug', 'svgInclude', 'json-copy', function() {
    console.log('static build success in production mode');
  });
});

gulp.task('static', ['images-copy', 'fonts', 'css', 'js', 'pug', 'pug-concat', 'json-copy'], function() {
  console.log('static build success in develop mode');
  return true;
});

//watchers and static server
gulp.task('watch', ['browser-sync'], function() {
  gulp.watch(['src/**/*.scss'], ['css']);

  gulp.watch(['src/js/*.js', 'src/js/vendor/*.js', 'src/blocks/**/**/*.js'], ['js']);

  gulp.watch(['src/blocks/*/*/*.pug', 'src/pug/layouts/*.pug', 'src/pug/views/*.pug'], ['pug-page']);
  gulp.watch('src/pug/views/*.pug', ['pug-page']);

  gulp.watch('src/json/*.json', ['json-copy']);

  gulp.watch('dest/css/main.css', function() {
    browserSync.reload("*.css");
    browserSync.reload("*.pug");
  });
});

//reload one page
gulp.task('page', function() {
  return runSequence('pug', 'js', 'css', 'watch', function() {
    const name = argv.name ? argv.name.split(',') : 'index';
    pageName = name;

    gulp.watch(`dest/${name}.html`).on('change', browserSync.reload);
    gulp.watch(`dest/js/main.js`).on('change', browserSync.reload);
    console.log('page is run');
    return true;
  });
});

gulp.task('browser-sync', function() {
  browserSync.init({
    server: {
      baseDir: "dest/"
    }
  });
});

// PUG
gulp.task('pug', ['svg', 'pug-concat'], function() {
  return gulp.src('src/pug/views/*.pug')
  .pipe(gulpif(!isProd, changed('dest', {extension: '.html'})))
  .pipe(plumber())
  .pipe(pug({
    pretty: true
  }))
  .pipe(gulp.dest('dest'));
});

gulp.task('pug-page', ['pug-concat'], function() {
  return gulp.src(`src/pug/views/${pageName}.pug`)
  .pipe(plumber())
  .pipe(pug())
  .pipe(gulp.dest('dest'));
});

gulp.task('pug-concat', function() {
  return gulp.src(['src/blocks/*/*/*.pug'])
  .pipe(plumber())
  .pipe(concat('_mixins.pug'))
  .pipe(gulp.dest('src/pug/'));
});


// JSON
gulp.task('json-copy', function() {
  return gulp.src('src/json/*')
  .pipe(gulp.dest('dest/json/'))
});

//CSS
gulp.task('css', ['sass'], function() {
  return gulp.src('src/css/compiled/main.css')
  .pipe(rename('main.css'))
  .pipe(sourcemaps.init())
  .pipe(postcss([require('autoprefixer')]))
  .pipe(sourcemaps.write('.'))
  .pipe(gulp.dest('dest/css/'))
  .pipe(browserSync.stream({match: "*.css"}));
});

gulp.task('sass', function() {
  return gulp.src(['src/css/variables.scss', 'src/css/vendor/*.scss', 'src/css/base.scss', 'src/blocks/base/**/*.scss', 'src/blocks/composite/**/*.scss', 'src/css/utils.scss'])
  .pipe(concat('main.css'))
  .pipe(sass().on('error', sass.logError))
  .pipe(gulp.dest('src/css/compiled'));
});

gulp.task('sass:bitrix', function() {
  return gulp.src(['src/css/variables.scss', 'src/css/vendor/fotorama.scss', 'src/css/base.scss', 'src/blocks/**/*.scss', 'src/css/utils.scss'])
  .pipe(concat('bitrix.css'))
  .pipe(sass().on('error', sass.logError))
  .pipe(gulp.dest('src/css/compiled'));
});

gulp.task('css-minify', () => {
  return gulp.src('dest/css/*.css')
  .pipe(sourcemaps.init())
  .pipe(cleanCSS())
  .pipe(sourcemaps.write('/'))
  .pipe(gulp.dest('dest/css/'))
});

//JS
gulp.task('js', ['js-build:vendor', 'js-build:project'], function() {
  return gulp.src([
    'src/js/_compiled/_vendor-code.js',
    'src/js/_compiled/_project-code.js'
  ])
  .pipe(concat('main.js'))
  .pipe(gulp.dest('dest/js/'))
  .pipe(gulp.dest('src/'));

});

gulp.task('js-uglify', function() {
  return gulp.src('dest/js/main.js')
  .pipe(sourcemaps.init())
  .pipe(uglify())
  .pipe(sourcemaps.write('/'))
  .pipe(gulp.dest('dest/js/'))
});

gulp.task('js-build:vendor', function() {
  return gulp.src([
    'src/js/jquery.min.js',
    'src/js/vendor/*.js',
    'src/js/core.js'])
  .pipe(concat('_vendor-code.js'))
  .pipe(gulp.dest('src/js/_compiled/'));
});

gulp.task('js-build:project', function() {
  return gulp.src([
    'src/js/initial.js',
    'src/blocks/base/**/*.js',
    'src/blocks/composite/**/*.js'])
  .pipe(babel({
    presets: ['es2015']
  }))
  .pipe(concat('_project-code.js'))
  .pipe(gulp.dest('src/js/_compiled/'));
});


gulp.task('buster', function() {
  return gulp.src(['dest/js/main.js', 'dest/css/main.css'])
  .pipe(bust())
  .pipe(gulp.dest('.'))
});

//images
gulp.task('images', function() {
  runSequence('images-optimize', 'images-copy');
});

gulp.task('images-optimize', function() {
  return gulp.src('src/images/**/*.+(png|jpg|gif|svg)')
  .pipe(imagemin())
  .pipe(gulp.dest('src/images'))
});

gulp.task('images-copy', function() {
  return gulp.src('src/images/**/*.+(png|jpg|gif|svg)')
  .pipe(gulp.dest('dest/images'))
});

gulp.task('svg', function() {
  let target = gulp.src('src/pug/svg.pug');
  let source = gulp.src('src/images/svg/*.svg')
  .pipe(svgmin())
  .pipe(svgstore({inlineSvg: true}));

  function fileContents(filePath, file) {
    return file.contents.toString();
  }

  return target
  .pipe(inject(source, {transform: fileContents}))
  .pipe(gulp.dest('src/pug/'));
});

gulp.task('svgInclude', function() {
  return gulp
  .src('src/images/svg/*.svg')
  .pipe(svgmin())
  .pipe(svgstore())
  .pipe(gulp.dest('dest/svg/'));
});

gulp.task('svgmin', function() {
  gulp
  .src('src/images/svg/*.svg')
  .pipe(svgmin({
    plugins: [{
      removeTitle: true
    }]
  }))
  .pipe(gulp.dest('src/images/svg/'));

  gulp
  .src('src/images/icons/*.svg')
  .pipe(svgmin({
    plugins: [{
      removeTitle: true
    }]
  }))
  .pipe(gulp.dest('src/images/icons/'));
});

//fonts
gulp.task('fonts', function() {
  return gulp.src('src/fonts/*')
  .pipe(gulp.dest('dest/fonts'))
});

//create block (use - gulp create --name=%NAME% --type=?b --tech=%tech%)
gulp.task('create', function() {
  let name = argv.name ? argv.name.split(',') : [],
    tech = argv.tech ? argv.tech.split(',') : ['pug', 'scss', 'js'],
    blockTypeFolder = argv.type === 'b' ? 'base' : 'composite',
    blockFolder, // папка для конкретного блока
    i;

  // создаваемый блок обязан иметь имя
  if (!name.length) {
    return gutil.log('Введите имя блока');
  }

  for (i = 0; i < name.length; i++) {
    blockFolder = path.normalize(path.join(blocksFolder, blockTypeFolder, name[i]));

    return fs.access(blockFolder, fs.constants.R_OK | fs.constants.W_OK, (err) => {
      //if (!err) {
      //  return gutil.log(`Блок с именем «${name[i]}» уже существует`);
      //} else {
      if (
        !fs.existsSync(blockFolder)
      ) {
        fs.mkdirSync(blockFolder);
      }
      createTechFile(name[i], blockFolder, tech);
      //}
    })
      ;

  }
});

function getTemplate(tech) {
  return fs.readFileSync(path.join(tplFolder, tech + '.txt'), 'utf8');
}

function createTechFile(blockName, folderPath, tech) {
  let tpl;
  let jsBlockName = blockName
    .split('-')
    .reduce((previousValue, currentItem, index) => {
      if (index > 0
      ) {
        currentItem = currentItem[0].toUpperCase() + currentItem.slice(1)
      }
      return previousValue + currentItem
    })
  ;

  for (let j = 0; j < tech.length; j++) {
    const filePath = folderPath + "/" + blockName + "." + tech[j];
    switch (tech[j]) {
      case 'pug':
        tpl = getTemplate('pug').replace(/{{blockname}}/g, blockName);
        break;
      case 'scss':
        tpl = getTemplate('css').replace(/{{blockname}}/g, blockName);
        break;
      //temporary disable generate js files
      case 'js':
        tpl = getTemplate('js').replace(/{{blockname}}/g, jsBlockName).replace(/{{projectname}}/g, projectName);
        break;
      default:
        tpl = '';
    }

    fs.writeFile(filePath, tpl, (err) => {
      if (err) throw err;
      console.log(`Блок ${blockName} успешно создан (${tech[j]})`);
    })
    ;
  }
}
