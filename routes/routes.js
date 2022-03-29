const express = require('express');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const moment = require('moment');
const knex = require('../dbconnection');
const { checkAuthenticated, checkNotAuthenticated } = require('../middlewares/auth');

const router = express.Router();

// admin job listing get route
router.get('/', async (req, res) => {
  const active_job_opening = await knex("jobs.job_opening")
  .where('status','0');
  const jobOpening = await knex('jobs.job_opening').orderBy('job_id');
  const admin_department = await knex('admin.department');
  const {date_opened} = active_job_opening[0]|| {};
  const date = moment(date_opened).format("DD MMMM YYYY")
  const jobSkill = await knex('jobs.job_opening')
    .innerJoin('jobs.skill', 'jobs.job_opening.job_id', 'jobs.skill.job_id')
    .innerJoin('admin.skill', 'jobs.skill.skill_id', 'admin.skill.skill_id');
  const jobApplications = await knex('job_application.applicant_details').innerJoin(
    'jobs.job_opening',
    'job_application.applicant_details.job_id',
    'jobs.job_opening.job_id'
  );
  res.render('index', {
    jobOpening,
    admin_department,
    jobSkill,
    jobApplications,
    date,
    active_job_opening,
  });
});

// admin job listing post route
router.post('/job/:job_id/status', (req, res) => {
  const jobId = req.params.job_id;
  const { status } = req.body;

  status.forEach((jobStatus) => {
    knex('jobs.job_opening')
      .update({ status: jobStatus })
      .where({ job_id: jobId })
      .then((results) => results);
  });
  res.redirect('/');
});

// register get route
router.get('/register', checkNotAuthenticated, (req, res) => {
  res.render('register');
});

// register post route
router.post('/register', checkNotAuthenticated, async (req, res) => {
  const { username, password } = req.body;
  const userFound = await knex('admin.users')
    .where({ user_name: username })
    .first()
    .then((row) => {
      if (row) {
        return row.user_name;
      }
      return row;
    });
  if (userFound === username) {
    req.flash('error', 'User with that username already exists');
    res.redirect('/register');
  } else {
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      knex('admin.users')
        .insert({
          user_name: username,
          password: hashedPassword,
        })
        .then(() => {
          res.redirect('/login');
        });
    } catch (error) {
      console.log(error);
      req.flash('error', 'Cant insert');
      res.redirect('/register');
    }
  }
});

// login get route
router.get('/login', checkNotAuthenticated, async (req, res) => {
  const user = knex('admin.users');
  knex('admin.users').then((results) => {
    if (results != 0) {
      res.render('login', {
        title: 'Log In',
        user,
      });
    } else {
      res.redirect('/register');
    }
  });
});

// login post route
router.post(
  '/login',
  checkNotAuthenticated,
  passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true,
  })
);

// delete/logout route
router.delete('/logout', (req, res) => {
  req.logOut();
  res.redirect('/login');
});

//load data


module.exports = router;
