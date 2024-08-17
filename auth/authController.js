const User = require('./model/User')
const Roles = require('./model/Roles')
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {
    validationResult
} = require('express-validator')
const {
    secret
} = require('./config')

const generateAccesToken = (id, roles) => {
    const payload = {
        id,
        roles
    }
    return jwt.sign(payload, secret, {
        expiresIn: "24h"
    })
}
const ageParams = ["4-7", "8-10", "11-13", "14-17", "18+"];
class authController {

    //*****************************ПОЛЬЗОВАТЕЛЬ*********************** */

    async registr(req, res) {
        try {
            const errors = validationResult(req)
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    message: "Ошибка при регистрации",
                    errors
                })
            }
            const name = req.body.name ?? 'User';
            const {
                username,
                password
            } = req.body

            // Проверка username с использованием регулярного выражения
            const usernameRegex = /^([\w]+\.?)+(?<!\.)@(?!\.)[a-zа-я0-9ё\.-]+\.?[a-zа-яё]{2,}$/ui;
            if (!usernameRegex.test(username)) {
                return res.status(400).json({
                    message: "Некорректный формат логина"
                })
            }

            // Проверка пароля с использованием регулярного выражения
            const passwordRegex = /^[a-zA-Z._0-9]+$/;
            if (!passwordRegex.test(password)) {
                return res.status(400).json({
                    message: "Пароль должен содержать только буквы a-z, A-Z, цифры 0-9, точку (.) и символ подчеркивания (_)"
                })
            }

            const candidate = await User.findOne({
                username
            })
            if (candidate) {
                return res.status(400).json({
                    message: `Пользователь с логином ${username} уже существует`
                })
            }
            const userRole = await Roles.findOne({
                value: "ADMIN"
            })
            const hashPassword = bcrypt.hashSync(password, 7);
            const user = new User({
                username,
                name,
                password: hashPassword,
                roles: [userRole.value]
            })
            await user.save()
            return res.json({
                message: "Регистарция прошлав успешно"
            })
        } catch (error) {
            console.log(error)
        }
    }
    async login(req, res) {
        try {
            const {
                username,
                password
            } = req.body

            // Проверка username с использованием регулярного выражения
            const usernameRegex = /^([\w]+\.?)+(?<!\.)@(?!\.)[a-zа-я0-9ё\.-]+\.?[a-zа-яё]{2,}$/ui;
            if (!usernameRegex.test(username)) {
                return res.status(400).json({
                    message: "Некорректный формат логина"
                })
            }

            // Проверка пароля с использованием регулярного выражения
            const passwordRegex = /^[a-zA-Z._0-9]+$/;
            if (!passwordRegex.test(password)) {
                return res.status(400).json({
                    message: "Пароль должен содержать только буквы a-z, A-Z, цифры 0-9, точку (.) и символ подчеркивания (_)"
                })
            }

            const user = await User.findOne({
                username
            })

            if (!user) {
                return res.status(400).json({
                    message: `Пользователь с логином ${username} не найден`
                })
            }
            const validPassword = bcrypt.compareSync(password, user.password)
            if (!validPassword) {
                return res.status(400).json({
                    message: `Пароль не правильный`
                })
            }
            const name = user.name;
            const user_id = user._id;
            const roles = user.roles;
            const token = generateAccesToken(user._id, user.roles)
            return res.json({
                token: token,
                name: name,
                roles: roles,
                id: user_id,
            })

        } catch (error) {
            console.log(error)
            res.status(400).json({
                message: 'Ошибка при авторизации'
            })
        }
    }
    async getUsers(req, res) {
        try {
            const users = await User.find()
            res.json(users)
        } catch (error) {
            console.log(error)
            res.status(403).json({
                message: 'Пользователь не авторизован'
            })
        }
    }
    async getUser(req, res) {
        const {
            username
        } = req.body
        const user = await User.findOne({
            username
        })
        try {
            res.json(user)
        } catch (error) {
            console.log(error)
            res.status(400).json({
                message: 'Пользователь не найден'
            })
        }
    }
    async updateUser({
        params: {
            id
        },
        body
    }, res) {
        try {
            
            if (body.password) {
                const passwordRegex = /^[a-zA-Z._0-9]+$/;
                // Проверка пароля с использованием регулярного выражения
                if (!passwordRegex.test(body.password)) {
                    return res.status(400).json({
                        message: "Пароль должен содержать только буквы a-z, A-Z, цифры 0-9, точку (.) и символ подчеркивания (_)"
                    })
                }
                body.password = bcrypt.hashSync(body.password, 7);
            }
            await User.findByIdAndUpdate(id, body, {
                new: true
            });
            res.status(200).json({
                message: "Данные пользователя успешно обновлены"
            });
        } catch (err) {
            res.status(400).json({
                message: err.message
            });
        }


    }
    async delete(req, res) {
        const {
            id,
        } = req.body
        try {
            let deleted = await User.findByIdAndDelete(id);
            res.status(200).json({
                message: "Пользователь удален!",
            });
        } catch (err) {
            res.status(404).json({
                message: "Ошибка при удалении пользователя"
            });
        }
    }
    async upadateRole(req, res) {
        const {
            id,
            newRole
        } = req.body
        try {
            await User.findByIdAndUpdate(id, {
                roles: newRole
            });
            res.status(200).json({
                message: "Роль пользователя успешно обновлена"
            });
        } catch (err) {
            res.status(404).json({
                message: err.message
            });
        }
    }
    async getByDateCreate(req, res) {
        try {
            const items = await User.find({
                registrDate: {
                    $gt: req.body.start,
                    $lt: req.body.end
                }
            });
            return res.status(200).send(items);

        } catch (err) {
            return res.status(400).send({
                message: "Ошибка получения данных",
            });
        }
    }
    /**************************РОЛИ**************************** */
    async getRoles(req, res) {
        try {
            const users = await Roles.find()
            res.json(users)
        } catch (error) {
            console.log(error)
            res.status(403).json({
                message: 'Пользователь не авторизован'
            })
        }
    }

    async addNewRole(req, res) {
        try {
            const {
                rolesName
            } = req.body
            const role = await Roles.findOne({
                rolesName
            })
            if (role) {
                return res.json({
                    message: `Такая роль уже есть`
                })
            }
            const roles = new Roles({
                value: rolesName
            })
            await roles.save()
            res.status(200).json({
                message: 'Роль успешно создана'
            })

        } catch (error) {
            console.log(error)
            res.status(400).json({
                message: 'Ошибка при добавлении новой роли'
            })
        }
    }
    async removeRole(req, res) {
        try {
            const {
                id
            } = req.body
            await Roles.findByIdAndDelete(id);
            res.status(200).json({
                message: 'Роль удалена'
            })

        } catch (error) {
            console.log(error)
            res.status(400).json({
                message: 'Ошибка при удалении роли'
            })
        }
    }

    /**
     * Возвращает массив доступных к выбору параметров возраста
     * @param {*} req 
     * @param {*} res 
     * @returns 
     */
    async getAgeParams(req, res) {

        return res.status(200).send({
            ageParams: ageParams
        })
    }



}

module.exports = new authController()