var fs = require('fs');
var path = require('path');
var async = require('neo-async');
var winston = require('winston');

var common = require('../../../core/lib/common');
var misc = require('../../../core/lib/misc');
var connection = require('../../../core/lib/connection');

var db = require('./database');

function reservationForm(req, res) {
    var params = {
        category: req.params['cate'] || req.query['cate'] || 1,
    };

    var mysql = connection.get();

    db.readReservationStatus(mysql, params.category, function (error, results) {
        params.status = results;

        return res.render(BLITITOR.config.site.theme + '/page/reservation/form', params);
    });
}

function reservationList(req, res) {
    var params = {
        category: req.params['cate'] || req.query['cate'] || 1,
        xhr: req.xhr || false
    };

    var mysql = connection.get();

    db.readReservationList(mysql, params, function (error, result) {
        return res.send(result);
    });
}

function reservationStatusList(req, res) {
    var params = {
        category: req.params['cate'] || req.query['cate'] || 1,
        xhr: req.xhr || false
    };

    var mysql = connection.get();

    db.readReservationStatus(mysql, params.category, function (error, result) {
        params.cateList = result || [];

        res.render(BLITITOR.config.site.theme + '/page/reservation/status_list', params);
    });
}

function createReservation(req, res) {
    req.assert('register_name', 'Name is required').len(2, 20).withMessage('Must be between 2 and 10 chars long').notEmpty();
    req.assert('register_email', 'Email is required').notEmpty().withMessage('Email ID should be email type string').isEmail();
    req.assert('register_phone', 'Phone number is required').notEmpty();
    req.assert('register_phone_secret', 'Phone Secret number is required').notEmpty();

    var errors = req.validationErrors();

    if (errors) {
        var reservedSession = req.session['reservation'] || {};

        winston.warn('phone number with secret number', reservedSession.phone, reservedSession.phone_secret);
        winston.warn(errors);
        req.flash('error', errors);
        return res.redirect('back');
    }

    req.sanitize('register_name').escape();
    req.sanitize('register_email').trim();
    req.sanitize('register_phone').trim();

    // remove dash in phone field
    var reservationData = {
        name: req.body.register_name,
        email: req.body.register_email,
        phone: req.body.register_phone,
        info:  req.body.register_info,
    };

    var params = {};

    findReservationByGiven(reservationData, function (error, reservation) {

        var mysql = connection.get();

        if (reservation) {
            // go update
            db.updateReservation(mysql, params, function (err, result) {
                if (err) {
                    req.flash('error', {msg: err});

                    winston.error(err);

                    return res.redirect('back');
                }

                winston.warn('Updated reservation:', result);

                params.name = reservationData.name;
                params.mode = 'updated';

                return res.render('done', params);
            });
        } else {
            // go insert
            db.insertReservation(mysql, params, function (err, result) {
                if (err) {
                    req.flash('error', {msg: err});

                    winston.error(err);

                    return res.redirect('back');
                }

                winston.warn('Inserted reservation:', result);

                params.name = reservationData.name;
                params.mode = 'inserted';

                return res.render('done', params);
            });
        }
    });
}

function generateSecret(req, res) {
    var params = {
        phone: req.body.phone
    };

    req.session.reservation = {
        phone: params.phone,
        phone_secret: '1234'
    };

    // send ajax to phone message service

    res.send({
        "status": "success",
        "data": {
            "phone": params.phone
        }
    });
}

module.exports = {
    form: reservationForm,
    register: createReservation,
    list: reservationList,
    status: reservationStatusList,
    sendSecret: generateSecret
};

function findReservationByGiven(reservationData, callback) {
    var mysql = connection.get();

    db.readReservationByReservationdata(mysql, reservationData, function (err, rows) {
        if (err || !rows) {
            winston.warn("Can't Find by This reservationData", err, rows);

            return callback(err, null);
        }

        callback(err, rows[0]);
    });
}