document.addEventListener('DOMContentLoaded', () => {
  const Todo = function Todo(todo) {
    this.id = todo.id;
    this.title = todo.title;
    this.day = todo.day;
    this.month = todo.month;
    this.year = todo.year;
    this.completed = todo.completed;
    this.description = todo.description;
    this.createDueDate();
  }

  Object.assign(Todo.prototype, {
    createDueDate() {
      if (this.month && this.year) {
        this.due_date = this.month + '/' + this.year.slice(-2);
      } else {
        this.due_date = 'No Due Date';
      }
    },
  });

  const TodoManager = {
    add(todo) {
      this.todos.push(new Todo(todo));
      this.setActive(this.active.title, this.active.completed)
    },

    remove(id) {
      let todo = this.get(id);
      let index = this.todos.indexOf(todo);
      this.todos.splice(index, 1);
      this.setActive(this.active.title, this.active.completed)
    },

    update(id, data) {
      this.remove(id);
      this.add(data);
    },

    get(id) {
      return this.todos.filter(todo => todo.id === Number(id))[0];
    },

    getCompleted() {
      return this.todos.filter(todo => todo.completed);
    },

    getTodosByDate() {
      return this.todos.reduce((obj, todo) => {
        if (obj[todo.due_date]) {
          obj[todo.due_date].push(todo);
        } else {
          obj[todo.due_date] = [todo];
        }

        return obj;
      }, {});
    },

    getSortedTodosByDate() {
      let todos = this.getTodosByDate();
      return this.sortTodosByDate(todos);
    },

    getCompletedTodosByDate() {
      let todosByDate = this.getTodosByDate();

      return Object.keys(todosByDate).reduce((obj, date) => {
        let completed = todosByDate[date].filter(todo => todo.completed);

        if (completed.length > 0) {
          obj[date] = completed;
        }

        return obj;
      }, {});
    },

    getSortedCompletedTodosByDate() {
      let todos = this.getCompletedTodosByDate();
      return this.sortTodosByDate(todos);
    },

    setActive(title, completed = false) {
      let data;

      if (title === 'All Todos' || title === 'Completed') {
        data = this.todos;
      } else {
        data = this.getTodosByDate()[title] || [];
      }

      if (completed) {
        data = data.filter(todo => todo.completed);
      }

      this.active = { title, data: this.sort(data), completed };

      return this.active;
    },

    sortTodosByDate(todos) {
      let result = Object.keys(todos).map(key => {
        return { title: key, data: todos[key] };
      })

      return result.sort((a, b) => {
        if (a.title === 'No Due Date' && b.title === 'No Due Date') {
          return 0;
        } else if (a.title === 'No Due Date') {
          return -1;
        } else if (b.title === 'No Due Date') {
          return 1;
        } else {
          let [aMonth, aYear] = a.title.split('/');
          let [bMonth, bYear] = b.title.split('/');

          if (aYear === bYear) {
            return aMonth - bMonth;
          } else {
            return aYear - bYear;
          }
        }
      });
    },

    sort(todos) {
      let [completed, uncompleted] = [[], []];

      todos.forEach(todo => {
        todo.completed ? completed.push(todo) : uncompleted.push(todo);
      });

      completed.sort((a, b) => a.id - b.id);
      uncompleted.sort((a, b) => a.id - b.id);

      return uncompleted.concat(completed);
    },

    init(todos) {
      this.todos = todos.map(todo => new Todo(todo));
      return this;
    },
  };

  const App = {
    setupHandlebars() {
      this.templates = {};
      let templateScripts = [...document.querySelectorAll('[type="text/x-handlebars"]')];

      templateScripts.forEach(template => {
        this.templates[template.id] = Handlebars.compile(template.textContent);

        if (template.getAttribute('data-type') === 'partial') {
          Handlebars.registerPartial(template.id, template.textContent);
        }

        template.remove();
      });
    },

    renderInitialPage() {
      fetch('http://localhost:3000/api/todos')
        .then(response => response.json())
        .then(data => {
          this.todoManager = TodoManager.init(data);
          this.todoManager.setActive('All Todos');
          this.refreshPage();
          this.active = this.sidebarAllTodos.firstElementChild;
          this.active.classList.add('active');
        });
    },

    createTodo(data) {
      const params = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      };

      fetch('http://localhost:3000/api/todos', params)
        .then(response => response.json())
        .then(data => {
          this.todoManager.add(data);
          this.hideModalLayer();
          if (this.active) this.active.classList.remove('active');
          this.todoManager.setActive('All Todos');
          let activeTitle = this.todoManager.active.title;
          this.active = document.querySelector(`[data-title="${activeTitle}"]`);
          this.active.classList.add('active');
          this.refreshPage();
        });
    },

    updateTodo(data, id) {
      const params = {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      };

      fetch(`http://localhost:3000/api/todos/${id}`, params)
        .then(response => response.json())
        .then(data => {
          this.todoManager.update(id, data);
          this.hideModalLayer();
          this.refreshPage();
        });
    },

    deleteTodo(id) {
      this.todoManager.remove(id);

      fetch(`http://localhost:3000/api/todos/${id}`, { method: 'DELETE' })
        .then(response => this.refreshPage()); 
    },

    clearSidebar() {
      [...this.sidebarAllTodos.childNodes].forEach(node => node.remove());
      [...this.sidebarAllLists.childNodes].forEach(node => node.remove());
      [...this.sidebarCompletedTodos.childNodes].forEach(node => node.remove());
      [...this.sidebarCompletedLists.childNodes].forEach(node => node.remove());
    },

    renderSidebar() {
      this.clearSidebar();
      let allTodosSidebarHTML = this.templates.all_todos_template(this.todoManager.todos.length);
      this.sidebarAllTodos.insertAdjacentHTML('afterbegin', allTodosSidebarHTML);

      let todosByDate = this.todoManager.getSortedTodosByDate();
      let allListsSidebarHTML = this.templates.all_list_template(todosByDate);
      this.sidebarAllLists.insertAdjacentHTML('afterbegin', allListsSidebarHTML);

      let totalCompleted = this.todoManager.getCompleted().length;
      let completedSidebarHTML = this.templates.completed_todos_template(totalCompleted);
      this.sidebarCompletedTodos.insertAdjacentHTML('afterbegin', completedSidebarHTML);

      let completedByDate = this.todoManager.getSortedCompletedTodosByDate();
      let completedByDateHTML = this.templates.completed_list_template(completedByDate);
      this.sidebarCompletedLists.insertAdjacentHTML('afterbegin', completedByDateHTML);
      
      this.changeActiveSidebar();
    },

    changeActiveSidebar() {
      let activeSection;

      if (this.todoManager.active.completed) {
        activeSection = this.sidebarCompletedItems;
      } else {
        activeSection = this.sidebarAllItems;
      }

      let activeTitle = this.todoManager.active.title;
      this.active = activeSection.querySelector(`[data-title="${activeTitle}"]`);
      if (this.active) this.active.classList.add('active');
    },

    clearCurrentList() {
      [...this.listTitle.childNodes].forEach(node => node.remove());
      [...this.listTable.childNodes].forEach(node => node.remove());
    },

    renderCurrentList() {
      this.clearCurrentList();
      let titleHTML = this.templates.title_template(this.todoManager.active);
      this.listTitle.insertAdjacentHTML('afterbegin', titleHTML);

      let todosHTML = this.templates.list_template(this.todoManager.active);
      this.listTable.insertAdjacentHTML('afterbegin', todosHTML);
    },

    refreshPage() {
      this.renderCurrentList();
      this.renderSidebar();
    },

    bindEventListeners() {
      this.addNew.addEventListener('click', this.handleClickAddNew.bind(this));
      this.listTable.addEventListener('click', this.handleTableClick.bind(this));
      this.modalLayer.addEventListener('click', this.hideModalLayer.bind(this));
      this.modalForm.addEventListener('submit', this.handleModalFormSubmit.bind(this));
      this.markCompleteButton.addEventListener('click', this.handleMarkComplete.bind(this));
      this.sidebarAllTodos.addEventListener('click', this.handleSidebarTodos.bind(this));
      this.sidebarAllLists.addEventListener('click', this.handleSidebarLists.bind(this));
      this.sidebarCompletedTodos.addEventListener('click' ,this.handleSidebarTodos.bind(this));
      this.sidebarCompletedLists.addEventListener('click', this.handleSidebarLists.bind(this));
    },

    handleClickAddNew(e) {
      this.showModalLayer();
      this.modalForm.setAttribute('method', 'post');
      [...this.modalFormInputs].forEach(input => {
        input.value = '';
      });
    },

    handleTableClick(e) {
      e.preventDefault();
      let tag = e.target.tagName;
      let id = e.target.closest('tr').getAttribute('data-id');

      if (e.target.classList.contains('delete') || tag === 'IMG') {
        this.deleteTodo(id);
      } else if (e.target.classList.contains('list_item') || tag === 'SPAN') {
        this.completeTodo(id);
      } else if (tag === 'LABEL') {
        this.showUpdateModal(id);
      }
    },

    handleModalFormSubmit(e) {
      e.preventDefault();
      let data = this.getFormData();
      let method = e.target.getAttribute('method').toUpperCase();

      if (!data.title || data.title.length < 3) {
        alert('You must enter a title at least 3 characters long.');
      } else {
        if (method === 'POST') {
          this.createTodo(data);
        } else if (method === 'PUT') {
          let id = e.target.getAttribute('data-id');
          this.updateTodo(data, id);
        }
      }
    },

    handleMarkComplete(e) {
      e.preventDefault();

      if (this.modalForm.getAttribute('method') === 'post') {
        alert('Cannot mark as complete as item has not been created yet!');
      } else if (this.modalForm.getAttribute('method') === 'put') {
        let id = this.modalForm.getAttribute('data-id');
        if (!this.todoManager.get(id).completed) {
          this.completeTodo(id);
        }

        this.hideModalLayer();
      }
    },
    
    handleSidebarTodos(e) {
      if (this.active) this.active.classList.remove('active');
      this.active = e.currentTarget.firstElementChild;
      this.active.classList.add('active');
      let completed = this.active.closest('section').id.includes('completed');

      if (completed) {
        this.todoManager.setActive('Completed', completed);
      } else {
        this.todoManager.setActive('All Todos', completed);
      }

      this.renderCurrentList();
    },

    handleSidebarLists(e) {
      if (this.active) this.active.classList.remove('active');
      this.active = e.target.closest('dl');
      this.active.classList.add('active');
      let title = this.active.getAttribute('data-title');
      let completed = this.active.closest('article').id.includes('completed');
      this.todoManager.setActive(title, completed)
      this.renderCurrentList();
    },

    hideModalLayer() {
      this.modalLayer.style.display = 'none';
      this.modalFormContainer.style.display = 'none';
    },

    showModalLayer() {
      this.modalLayer.style.display = 'block';
      this.modalFormContainer.style.display = 'block';
    },

    showUpdateModal(id) {
      let todo = this.todoManager.get(id);

      this.modalForm.setAttribute('data-id', id);
      [...this.modalFormInputs].forEach(input => {
        input.value = todo[input.name];
      });

      this.modalForm.setAttribute('method', 'put');
      this.showModalLayer();
    },

    completeTodo(id) {
      let node = document.getElementById(`item_${id}`);
      let todo = this.todoManager.get(id);
      todo.completed = !todo.completed;

      if (todo.completed) {
        node.setAttribute('checked', '');
      } else {
        node.removeAttribute('checked');
      }
      
      this.updateTodo(todo, id);
    },

    getFormData() {
      return [...this.modalFormInputs].reduce((obj, input) => {
        if (input.value) {
          obj[input.name] = input.value;
        }

        return obj;
      }, {});
    },

    getSidebarElements() {
      this.sidebarCompletedItems = document.getElementById('completed_items');
      this.sidebarAllItems = document.getElementById('all');
      this.sidebarAllTodos = document.getElementById('all_todos');
      this.sidebarAllLists = document.getElementById('all_lists');
      this.sidebarCompletedTodos = document.getElementById('completed_todos');
      this.sidebarCompletedLists = document.getElementById('completed_lists');
    },

    getMainElements() {
      this.addNew = document.querySelector('label[for="new_item"]');
      this.listTitle = document.querySelector('#items header');
      this.listTable = document.querySelector('main table tbody');
    },

    getModalElements() {
      this.modalLayer = document.getElementById('modal_layer');
      this.modalFormContainer = document.getElementById('form_modal');
      this.modalForm = this.modalFormContainer.firstElementChild;
      this.modalFormInputs = this.modalFormContainer.querySelectorAll('[name]');
      this.markCompleteButton = document.getElementById('complete_button');
    },

    init() {
      this.getSidebarElements();
      this.getMainElements();
      this.getModalElements();
      this.setupHandlebars();
      this.renderInitialPage();
      this.bindEventListeners();
    },
  };

  App.init();
});
