/**
 * Created by Naver on 2017. 6. 6..
 */
const gulp = require('gulp');
const jscs = require('gulp-jscs');

gulp.task('default', () => {
  return gulp.src('*.js')
    .pipe(jscs({fix: true}))
    .pipe(jscs.reporter())
    .pipe(jscs.reporter('fail'))
    .pipe(gulp.dest('src'));
});
